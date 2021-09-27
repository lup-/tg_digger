<template>
    <v-container class="fill-height align-center justify-center">
        <connect-form></connect-form>
    </v-container>
</template>

<script>
    import ConnectForm from "@/components/Telegram/ConnectForm";
    export default {
        components: {ConnectForm}
    }
</script>