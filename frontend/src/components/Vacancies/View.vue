<template>
    <v-container class="fill-height align-start">
        <v-row>
            <v-col cols="12">
                <v-card>
                    <v-card-title>{{item.position || '-'}}</v-card-title>
                    <v-card-subtitle>{{item.date ? getDate(item) : '-'}}, {{item.company || '-'}}</v-card-subtitle>
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
    import moment from "moment";

    export default {
        extends: CrudEdit,
        data() {
            return {
                item: {},

                ACTION_LOAD: 'vacancy/loadItems',
                ACTION_DELETE: 'vacancy/deleteItem',
                ROUTE_EDIT: 'vacancyView',
                ROUTE_NEW: 'vacancyNew',
                STORE_MODULE: 'vacancy',
                ROUTE_LIST: 'vacanciesList',
                GETTER_NAME: 'vacancy/byId',
            }
        },
        methods: {
            getDate(vacancy) {
                return moment.unix(vacancy.date).format('DD.MM.YYYY');
            },
        },
        computed: {
        }
    }
</script>

<style scoped>

</style>