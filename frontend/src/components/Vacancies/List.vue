<template>
    <v-container class="fill-height align-start">
        <v-row :align="isEmpty || isLoading ? 'center' : 'start'" :justify="isEmpty || isLoading ? 'center' : 'start'">
            <v-col cols="3">
                <v-combobox
                        :items="cities"
                        v-model="filter.cities"
                        multiple
                        chips
                        deletable-chips

                        :loading="citiesLoading"
                        :search-input.sync="searchCities"
                        label="Города"
                ></v-combobox>

                <v-combobox
                        :items="keywords"
                        v-model="filter.keywords"
                        multiple
                        chips
                        deletable-chips

                        :loading="keywordsLoading"
                        :search-input.sync="searchKeywords"
                        label="Ключевые слова"
                ></v-combobox>
            </v-col>
            <v-col cols="9">
                <v-data-iterator
                        :items="items"
                        :items-per-page.sync="itemsPerPage"
                >
                    <template v-slot:default="props">
                        <v-row>
                            <v-col v-for="vacancy in props.items" :key="vacancy._id" cols="12" md="6" lg="4">
                                <v-card>
                                    <v-card-title @click="gotoView(vacancy._id)">{{vacancy.position || '-'}}</v-card-title>
                                    <v-card-subtitle>{{vacancy.date ? getDate(vacancy) : '-'}}, {{vacancy.company || '-'}}</v-card-subtitle>
                                    <v-divider></v-divider>
                                    <v-list-item v-if="vacancy.location">
                                        <v-list-item-title>Город</v-list-item-title>
                                        <v-list-item-subtitle>{{vacancy.location}}</v-list-item-subtitle>
                                    </v-list-item>
                                    <v-list-item v-if="vacancy.schedule">
                                        <v-list-item-title>График</v-list-item-title>
                                        <v-list-item-subtitle>{{vacancy.schedule}}</v-list-item-subtitle>
                                    </v-list-item>
                                    <v-list-item v-if="vacancy.salary">
                                        <v-list-item-title>Зарплата</v-list-item-title>
                                        <v-list-item-subtitle>{{vacancy.salary.value}} {{vacancy.salary.currency}}</v-list-item-subtitle>
                                    </v-list-item>
                                    <v-list-item v-if="vacancy.demands" two-line>
                                        <v-list-item-content>
                                            <v-list-item-title class="mb-2">Требования</v-list-item-title>
                                            <div>
                                                <v-chip v-for="demand in vacancy.demands" :key="demand" dense x-small class="mb-2 mr-2">{{demand}}</v-chip>
                                            </div>
                                        </v-list-item-content>
                                    </v-list-item>
                                    <v-divider></v-divider>
                                    <v-list-item v-if="vacancy.keywords" two-line>
                                        <v-list-item-content>
                                            <v-list-item-title class="mb-2">Ключевые слова</v-list-item-title>
                                            <div>
                                                <v-chip v-for="keyword in vacancy.keywords" :key="keyword" dense x-small class="mb-2 mr-2">{{keyword}}</v-chip>
                                            </div>
                                        </v-list-item-content>
                                    </v-list-item>
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
    import CrudList from "@/components/CrudList";
    import moment from "moment";
    import axios from "axios";

    export default {
        extends: CrudList,
        data() {
            return {
                isLoading: false,
                itemsPerPage: 12,
                filter: {keywords: [], cities: []},
                keywordsLoading: false,
                citiesLoading: false,
                searchKeywords: null,
                searchCities: null,
                keywords: [],
                cities: [],
                ACTION_LOAD: 'vacancy/loadItems',
                ACTION_DELETE: 'vacancy/deleteItem',
                ROUTE_VIEW: 'vacancyView',
                ROUTE_NEW: 'vacancyNew',
                STORE_MODULE: 'vacancy'
            }
        },
        watch: {
            filter: {
                deep: true,
                handler() {
                    this.loadItems();
                }
            },
            async searchKeywords() {
                this.loadKeywords();
            },
            async searchCities() {
                this.loadCities();
            },
        },
        async mounted() {
            await this.loadItems();
        },
        methods: {
            getDate(vacancy) {
                return moment.unix(vacancy.date).format('DD.MM.YYYY');
            },
            async loadKeywords() {
                if (this.keywordsLoading) {
                    return;
                }

                let query = this.searchKeywords;
                if (query.length < 3) {
                    return;
                }

                this.keywordsLoading = true;
                let response = await axios.post(`/api/vacancies/keywords`, {query});
                this.keywords = response.data.keywords || [];
                this.keywordsLoading = false;
            },
            async loadCities() {
                if (this.citiesLoading) {
                    return;
                }

                let query = this.searchCities;
                if (query.length < 3) {
                    return;
                }

                this.citiesLoading = true;
                let response = await axios.post(`/api/vacancies/cities`, {query});
                this.cities = response.data.cities || [];
                this.citiesLoading = false;
            },
            async loadItems() {
                this.isLoading = true;
                await this.$store.dispatch('vacancy/loadItems', this.filter);
                this.isLoading = false;
            }
        }
    }
</script>
<style scoped>
    .v-card__title {cursor: pointer;}
</style>