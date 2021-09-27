import re

from telethon import TelegramClient

from telethon.tl.functions.channels import JoinChannelRequest, LeaveChannelRequest
from telethon.tl.functions.messages import ImportChatInviteRequest, CheckChatInviteRequest, GetAdminsWithInvitesRequest, \
    GetChatInviteImportersRequest
from telethon.tl.types import PeerUser, PeerChat, PeerChannel, InputUserEmpty
from telethon import functions, types, errors

from sanic import Sanic
from sanic.response import json
from ttjson import ttjson
from functools import partial
import asyncio
import os
import logging
import datetime

logging.basicConfig(level=logging.DEBUG)

API_ID = int(os.environ['API_ID'])
API_HASH = os.environ['API_HASH']

app = Sanic(name=__name__)


def client_key_from_phone(phone_number):
    return phone_number


async def wait_code(sanic_app, phone_number):
    client_key = client_key_from_phone(phone_number)
    loop = asyncio.get_event_loop()

    login_attempt = app.ctx.tg_login_attempts[client_key] if client_key in app.ctx.tg_login_attempts else 0

    if login_attempt > 0 and client_key in app.ctx.connect_futures:
        app.ctx.tg_errors[client_key] = Exception('Неверно указан код')
        app.ctx.connect_futures[client_key].set_result(False)

    code_future = app.ctx.tg_futures[client_key]

    if code_future and not code_future.done():
        code = await code_future
        app.ctx.tg_login_attempts[client_key] = login_attempt + 1
        return code
    else:
        app.ctx.tg_futures[client_key] = loop.create_future()
        app.ctx.connect_futures[client_key] = loop.create_future()


async def connect_tg_client(phone_number, password):
    client_key = client_key_from_phone(phone_number)

    loop = asyncio.get_event_loop()
    app.ctx.tg_futures[client_key] = loop.create_future()
    app.ctx.connect_futures[client_key] = loop.create_future()
    app.ctx.tg_login_attempts[client_key] = 0

    session_name = 'userbot_%s' % client_key
    tg_client = TelegramClient(session_name, API_ID, API_HASH)

    if hasattr(app.ctx, 'tg_errors'):
        app.ctx.tg_errors.pop(client_key, None)

    try:
        new_client = await tg_client.start(phone=phone_number, password=password,
                                           code_callback=partial(wait_code, app, phone_number))
        app.ctx.tg_clients[client_key] = new_client
        connect_future = app.ctx.connect_futures[client_key]
        if connect_future and not connect_future.done():
            connect_future.set_result(True)
        logging.critical("Telegram connected: %s" % phone_number)
    except Exception as e:
        logging.critical(str(e))
        app.ctx.tg_futures[client_key] = loop.create_future()
        app.ctx.connect_futures[client_key].set_result(False)
        app.ctx.connect_futures[client_key] = loop.create_future()
        app.ctx.tg_errors[client_key] = e


async def send_message(request):
    message_text = request.json['message_text']
    message_to = request.json['message_to']
    schedule_timestamp = request.json['schedule_timestamp'] if 'schedule_timestamp' in request.json else None
    schedule = None

    if schedule_timestamp:
        schedule = datetime.datetime.utcfromtimestamp(schedule_timestamp)

    error = None
    message = None
    try:
        message = await request.ctx.tg_client.send_message(message_to, message_text, schedule=schedule, parse_mode='html')
    except Exception as e:
        error = e

    if error:
        error = str(error)
        if 'Cannot find any entity' in error:
            error = 'Получатель не найден в Telegram'

    return json({"error": error}) if error else json({"message": ttjson(message)})


@app.listener('before_server_start')
def init_clients_storage(sanic_app, loop):
    if not hasattr(sanic_app.ctx, 'tg_clients'):
        sanic_app.ctx.tg_clients = {}
    if not hasattr(sanic_app.ctx, 'tg_futures'):
        sanic_app.ctx.tg_futures = {}
    if not hasattr(sanic_app.ctx, 'connect_futures'):
        sanic_app.ctx.connect_futures = {}
    if not hasattr(sanic_app.ctx, 'tg_errors'):
        sanic_app.ctx.tg_errors = {}
    if not hasattr(sanic_app.ctx, 'tg_login_attempts'):
        sanic_app.ctx.tg_login_attempts = {}


@app.listener('after_server_stop')
async def stop_tg_client(sanic_app, loop):
    if hasattr(sanic_app.ctx, 'tg_clients'):
        for client_key in sanic_app.ctx.tg_clients:
            tg_client = sanic_app.ctx.tg_clients[client_key]
            if tg_client and tg_client.is_connected():
                await tg_client.disconnect()


@app.middleware('request')
async def add_tg_client(request):
    if request.json:
        phone = request.json['phone']
        if phone:
            client_key = client_key_from_phone(phone)
            if hasattr(app.ctx, 'tg_clients') and client_key in app.ctx.tg_clients:
                request.ctx.tg_client = app.ctx.tg_clients[client_key]
            elif request.path not in ["/code", "/newClient", "/status"]:
                return json({"error": "Client not started!"})


@app.route('/me', methods=['POST'])
async def get_me(request):
    me = await request.ctx.tg_client.get_me()
    json_me = ttjson(me) if me else False
    return json({"me": json_me})


@app.route('/status', methods=['POST'])
async def get_client_status(request):
    phone = request.json['phone']
    client_key = client_key_from_phone(phone)

    client_started = hasattr(app.ctx, 'tg_clients') and client_key in app.ctx.tg_clients
    client_waiting = hasattr(app.ctx, 'tg_futures') and client_key in app.ctx.tg_futures and not app.ctx.tg_futures[
        client_key].done()

    status = "offline"
    if client_waiting:
        status = "waiting_code"

    if client_started:
        status = "online"

    return json({"status": status})


@app.route('/code', methods=['POST'])
async def enter_code(request):
    phone = request.json['phone']
    client_key = client_key_from_phone(phone)
    code = request.json['code']

    if hasattr(app.ctx, 'tg_futures') and client_key in app.ctx.tg_futures:
        app.ctx.tg_futures[client_key].set_result(code)
        is_ok = True

        if hasattr(app.ctx, 'connect_futures') and client_key in app.ctx.connect_futures:
            connect_future = app.ctx.connect_futures[client_key]
            if connect_future and not connect_future.done():
                is_ok = await connect_future

        error = False
        if not is_ok:
            error = str(app.ctx.tg_errors[client_key]) if client_key in app.ctx.tg_errors else False
            loop = asyncio.get_event_loop()
            app.ctx.connect_futures[client_key] = loop.create_future()

        return json({"ok": is_ok, "error": error})
    else:
        return json({"ok": False})


@app.route('/newClient', methods=['POST'])
async def new_client(request):
    phone = request.json['phone']
    password = request.json['password']
    client_key = client_key_from_phone(phone)

    client_started = hasattr(app.ctx, 'tg_clients') and client_key in app.ctx.tg_clients
    client_waiting = hasattr(app.ctx, 'tg_futures') and client_key in app.ctx.tg_futures and not app.ctx.tg_futures[client_key].done()
    client_ready = client_started and app.ctx.tg_clients[client_key].is_connected()
    can_start_new = not client_started and not client_ready

    if can_start_new:
        app.add_task(connect_tg_client(phone, password))
        return json({"started": True})

    return json({"started": False, "alreadyStarted": client_started, "alreadyWaiting": client_waiting,
                 "alreadyReady": client_ready})


@app.route('/getHistory', methods=['POST'])
async def get_history(request):
    peer = request.json['peer']
    offset_id = request.json['from_message_id'] if hasattr(request.json, 'from_message_id') else 0

    result = await request.ctx.tg_client(functions.messages.GetHistoryRequest(
        peer=peer,
        offset_id=offset_id,  # Offset message ID (only messages previous to the given ID will be retrieved). Exclusive.
        offset_date=None,  # Offset date (messages previous to this date will be retrieved). Exclusive.
        add_offset=0,  # Additional message offset (all of the specified offsets + this offset = older messages).
        limit=100,  # Number of messages to be retrieved.
        max_id=0,  # All the messages with a higher (newer) ID or equal to this will be excluded.
        min_id=offset_id,  # All the messages with a lower (older) ID or equal to this will be excluded.
        hash=0
    ))
    return json({"history": ttjson(result)})


@app.route('/searchUser', methods=['POST'])
async def search_user(request):
    query = request.json['query']
    result = await request.ctx.tg_client(functions.contacts.SearchRequest(
        q=query,
        limit=100
    ))
    return json({"search": ttjson(result)})


@app.route('/listDialogs', methods=['POST'])
async def list_dialogs(request):
    dialogs = await request.ctx.tg_client.get_dialogs()
    return json({"dialogs": ttjson(dialogs)})


@app.route('/logout', methods=['POST'])
async def logout(request):
    result = await request.ctx.tg_client.log_out()

    phone = request.json['phone']
    client_key = client_key_from_phone(phone)

    if hasattr(app.ctx, 'tg_clients'):
        app.ctx.tg_clients.pop(client_key, None)

    if hasattr(app.ctx, 'tg_futures'):
        app.ctx.tg_futures.pop(client_key, None)

    if hasattr(app.ctx, 'connect_futures'):
        app.ctx.connect_futures.pop(client_key, None)

    if hasattr(app.ctx, 'tg_errors'):
        app.ctx.tg_errors.pop(client_key, None)

    if hasattr(app.ctx, 'tg_login_attempts'):
        app.ctx.tg_login_attempts.pop(client_key, None)

    return json({"logout": result})


@app.route('/sendMessage', methods=['POST'])
async def send_message_route(request):
    return await send_message(request)

@app.exception(Exception)
async def catch_anything(request, exception):
    return json({"error": str(exception)})


app.run(host='0.0.0.0', port=3000)
