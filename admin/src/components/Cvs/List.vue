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
                            <v-col v-for="cv in props.items" :key="cv._id" cols="12" md="6" lg="4">
                                <v-card>
                                    <v-card-title @click="gotoView(cv._id)">{{cv.name || 'Аноним'}}</v-card-title>
                                    <v-card-subtitle>{{cv.position || '-'}}</v-card-subtitle>
                                    <v-divider></v-divider>
                                    <v-list-item v-if="cv.city">
                                        <v-list-item-title>Город</v-list-item-title>
                                        <v-list-item-subtitle>{{cv.city}}</v-list-item-subtitle>
                                    </v-list-item>
                                    <v-list-item v-if="cv.age">
                                        <v-list-item-title>Возраст</v-list-item-title>
                                        <v-list-item-subtitle>{{cv.age}}</v-list-item-subtitle>
                                    </v-list-item>
                                    <v-list-item v-if="cv.experience">
                                        <v-list-item-title>Опыт</v-list-item-title>
                                        <v-list-item-subtitle>{{cv.experience}}</v-list-item-subtitle>
                                    </v-list-item>
                                    <v-list-item v-if="cv.salary">
                                        <v-list-item-title>Зарплата</v-list-item-title>
                                        <v-list-item-subtitle>{{cv.salary.value}} {{cv.salary.currency}}</v-list-item-subtitle>
                                    </v-list-item>
                                    <v-list-item v-if="getSkills(cv)" two-line>
                                        <v-list-item-content>
                                            <v-list-item-title class="mb-2">Навыки</v-list-item-title>
                                            <div>
                                                <v-chip v-for="skill in getSkills(cv)" :key="skill" dense x-small class="mb-2 mr-2">{{skill}}</v-chip>
                                            </div>
                                        </v-list-item-content>
                                    </v-list-item>
                                    <v-divider></v-divider>
                                    <v-list-item v-if="cv.keywords" two-line>
                                        <v-list-item-content>
                                            <v-list-item-title class="mb-2">Ключевые слова</v-list-item-title>
                                            <div>
                                                <v-chip v-for="keyword in cv.keywords" :key="keyword" dense x-small class="mb-2 mr-2">{{keyword}}</v-chip>
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
                headers: [
                    {text: 'Имя', value: 'username'},
                    {text: 'Воронки', value: 'funnels'},
                    {text: 'Действия', value: 'actions', sortable: false},
                ],

                ACTION_LOAD: 'cv/loadItems',
                ACTION_DELETE: 'cv/deleteItem',
                ROUTE_EDIT: 'cvEdit',
                ROUTE_VIEW: 'cvView',
                ROUTE_NEW: 'cvNew',
                STORE_MODULE: 'cv'
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
            async loadKeywords() {
                if (this.keywordsLoading) {
                    return;
                }

                let query = this.searchKeywords;
                if (query.length < 3) {
                    return;
                }

                this.keywordsLoading = true;
                let response = await axios.post(`/api/cvs/keywords`, {query});
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
                let response = await axios.post(`/api/cvs/cities`, {query});
                this.cities = response.data.cities || [];
                this.citiesLoading = false;
            },
            getSkills(cv) {
                if (cv.skills && cv.skills.length > 0) {
                    return cv.skills;
                }

                if (cv.generatedSkills && cv.generatedSkills.length > 0) {
                    return cv.generatedSkills;
                }

                return false;
            },
            async loadItems() {
                this.isLoading = true;
                await this.$store.dispatch('cv/loadItems', this.filter);
                this.isLoading = false;
            }
        }
    }
</script>
<style scoped>
    .v-card__title {cursor: pointer;}
</style>
