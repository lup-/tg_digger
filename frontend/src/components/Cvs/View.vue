<template>
    <v-container class="fill-height align-start">
        <v-row>
            <v-col cols="12">
                <v-card>
                    <v-card-title>{{item.name || 'Аноним'}}</v-card-title>
                    <v-card-subtitle>{{item.position || '-'}}</v-card-subtitle>
                    <v-card-text>
                        <pre>{{item.source ? item.source.text || '' : ''}}</pre>
                    </v-card-text>
                    <v-divider></v-divider>
                    <v-card-text>
                        <v-list-item-title class="mb-2">Ключевые слова</v-list-item-title>
                        <div>
                            <v-chip v-for="keyword in item.keywords" :key="keyword" class="mb-2 mr-2">{{keyword}}</v-chip>
                        </div>
                    </v-card-text>
                    <v-card-actions>
                        <v-btn @click="gotoList">К списку</v-btn>
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    import CrudEdit from '@/components/CrudEdit';

    export default {
        extends: CrudEdit,
        data() {
            return {
                item: {},

                ACTION_LOAD: 'cv/loadItems',
                ACTION_DELETE: 'cv/deleteItem',
                ROUTE_EDIT: 'cvEdit',
                ROUTE_NEW: 'cvNew',
                STORE_MODULE: 'cv',
                ROUTE_LIST: 'cvsList',
                GETTER_NAME: 'cv/byId',
            }
        },
        methods: {
        },
        computed: {
        }
    }
</script>

<style scoped>

</style>