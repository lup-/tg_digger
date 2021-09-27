<template>
    <v-chip :input-value="selected" :small="small" :x-small="xSmall">
        <v-icon left v-if="skill.soft">mdi-circle-outline</v-icon>
        <v-icon left v-else>mdi-square-outline</v-icon>
        {{skill.name}}
    </v-chip>
</template>

<script>
    export default {
        props: ['selected', 'skill', 'small', 'xSmall']
    }
</script>

<style scoped>

</style>