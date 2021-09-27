<template>
    <v-container class="fill-height align-start">
        <v-row align="start" justify="start">
            <v-col cols="12">
                <v-data-iterator
                    :items="items"
                    :loading="loading"
                    :options.sync="options"
                    :server-items-length="totalItems"
                    :items-per-page="15"
                >
                    <template v-slot:header>
                        <v-toolbar flat class="mb-4">
                            <filter-field v-model="filter" :fields="filterFields" label="Фильтр" outlined @save="saveFilter"></filter-field>
                        </v-toolbar>
                    </template>

                    <template v-slot:default="props">
                        <v-row class="px-4">
                            <v-col
                                v-for="item in props.items"
                                :key="item._id"
                                cols="12"
                                sm="6"
                                md="4"
                                lg="3"
                            >
                                <v-card>
                                    <v-card-title class="subheading font-weight-bold">
                                        {{ getUserName(item) || "Без имени" }}
                                    </v-card-title>

                                    <v-divider></v-divider>

                                    <v-list dense>
                                        <v-list-item v-for="field in fields" :key="`${item.id}/${field.code}`" dense>
                                            <v-list-item-content>{{field.title}}</v-list-item-content>
                                            <v-list-item-content class="align-end">{{item[field.code]}}</v-list-item-content>
                                        </v-list-item>
                                    </v-list>

                                    <v-divider v-if="scanHasKeywords"></v-divider>
                                    <v-list dense v-if="scanHasKeywords">
                                        <v-list-item v-for="keyword in scan.keywords" :key="`${item.id}/${keyword}`" dense>
                                            <v-list-item-content>{{keyword}}</v-list-item-content>
                                            <v-list-item-content class="align-end">{{item.keywords ? item.keywords[keyword] || 0 : 0}}</v-list-item-content>
                                        </v-list-item>
                                    </v-list>
                                </v-card>
                            </v-col>
                        </v-row>
                    </template>
                </v-data-iterator>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    import FilterField from "../Filter/Filter"
    import clone from "lodash.clonedeep"

    export default {
        components: {FilterField},
        data() {
            return {
                loading: false,
                options: {
                    sortBy: ['totalMessages'],
                    sortDesc: [true],
                    itemsPerPage: 15,
                },
                filter: {},
                productDialogs: {},
                rawDataDialogs: {},

                fields: [
                    {title: 'Вопросов', code: 'totalQuestions'},
                    {title: 'Ответов', code: 'totalReplies'},
                    {title: 'Сообщений', code: 'totalMessages'},
                    {title: 'Контактов', code: 'peers'},
                ],
            }
        },
        async created() {
            this.initFilter();
        },
        async mounted() {
            await this.loadItems();
        },
        watch: {
            filter: {
                deep: true,
                handler() {
                    this.loadItems();
                }
            },
            options: {
                deep: true,
                handler() {
                    this.loadItems();
                }
            },
            scanId() {
                return this.loadItems();
            }
        },
        methods: {
            initFilter() {
                let defaultFilter = {};
                let savedFilter = localStorage.getItem('savedFilter');
                if (!savedFilter) {
                    this.filter = defaultFilter;
                    return;
                }

                this.filter = JSON.parse(savedFilter);
            },
            saveFilter() {
                localStorage.setItem('savedFilter', JSON.stringify(this.filter));
                this.$store.commit('setSuccessMessage', 'Фильтр сохранен!');
            },
            async loadItems() {
                if (!this.scanId) {
                    return;
                }

                this.loading = true;
                let sort = this.options.sortBy && this.options.sortBy.length > 0
                    ? this.options.sortBy.reduce((sortFields, fieldId, index) => {
                          let isDesc = this.options.sortDesc[index];
                          sortFields[fieldId] = isDesc ? -1 : 1;
                          return sortFields;
                      }, {})
                    : {};
                let limit = this.options.itemsPerPage || 15;
                let page = this.options.page || 1;
                let offset = (page-1)*limit;

                let filter = clone(this.filter);
                if (filter._fullName) {
                    let searchText = filter._fullName;
                    let regex = `.*${searchText}.*`;
                    filter._fullName = {$regex: regex, $options: 'i'};
                }

                await this.$store.dispatch('scan/loadDetails', {scanId: this.scanId, filter, sort, limit, offset});
                this.loading = false;
            },
            getUserName(statItem) {
                if (statItem.scanUser) {
                    let firstName = statItem.scanUser.first_name;
                    let lastName = statItem.scanUser.last_name;
                    let fullName = [lastName, firstName].filter(name => Boolean(name)).join(' ');

                    if (fullName) {
                        return fullName;
                    }

                    if (statItem.scanUser.username) {
                        return statItem.scanUser.username;
                    }

                    return null;
                }

                return null;
            }
        },
        computed: {
            scanId() {
                return this.$route.params && this.$route.params.id
                    ? this.$route.params.id || false
                    : false;
            },
            scan() {
                return this.$store.state.scan.activeScan;
            },
            scanHasKeywords() {
                return this.scan
                    ? this.scan.keywords && this.scan.keywords.length > 0
                    : false;
            },
            items() {
                return this.loading
                    ? []
                    : this.$store.state.scan.cards || [];
            },
            totalItems() {
                return this.$store.state.scan.totalCount;
            },
            filterFields() {
                return [
                    {text: 'Имя', id: '_fullName'},
                    {text: 'Вопросов', id: 'totalQuestions', type: 'number'},
                    {text: 'Ответов', id: 'totalReplies', type: 'number'},
                    {text: 'Сообщений', id: 'totalMessages', type: 'number'},
                ]
            }
        }
    }
</script>