import json
import datetime
import re
from telethon.tl.tlobject import TLObject

def date_format(field):
    if type(field) is datetime.datetime:
        return field.strftime("%Y-%m-%d %H:%M:%S")
    elif str(type(field)).find('telethon') != -1:
        return ttjson(field)

def tt_to_json_string(ttobject):
    #return json.dumps(ttobject.to_dict(), default=date_format)
    return json.dumps(tt_to_dict(ttobject))

def is_convertable_type(var):
    supported_types = (int, float, str, bool, tuple)
    return var is None or type(var) in supported_types

def tt_to_dict(ttoject):
    ttdict = {}
    fields = []
    if type(ttoject) is dict:
        fields = ttoject.items()
    elif hasattr(ttoject, '__dict__'):
        fields = vars(ttoject).items()
    else:
        return str(ttoject)

    for key, value in fields:
        if key.find('_') == 0:
            pass

        try:
            iter(value)
        except TypeError:
            is_list = False
        else:
            is_list = True

        if is_convertable_type(value):
            ttdict[key] = value
        elif type(value) is datetime.datetime:
            ttdict[key] = value.strftime("%Y-%m-%d %H:%M:%S")
        elif type(value) is bytes:
            ttdict[key] = "".join(map(chr, value))
        elif type(value) is list:
            ttdict[key] = [tt_to_dict(child) for child in iter(value)]
        elif type(value).__base__ is object:
            ttdict[key] = tt_to_dict(value)
        elif type(value).__base__ is TLObject or hasattr(value, 'to_dict'):
            ttdict[key] = tt_to_dict(value.to_dict())
        elif str(value).find('object at') != -1:
            ttdict[key] = None
        elif is_list:
            ttdict[key] = [tt_to_dict(child) for child in iter(value)]
        else:
            ttdict[key] = str(value)

    return ttdict

def ttjson(ttobject):
    try:
        iterator = iter(ttobject)
    except TypeError:
        tt_str = tt_to_json_string(ttobject)
    else:
        tt_str = json.dumps([json.loads(tt_to_json_string(child)) for child in iterator])

    return json.loads(tt_str)