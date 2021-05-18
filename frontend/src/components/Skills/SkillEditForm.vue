<template>
    <v-container class="pa-0">
        <v-row>
            <v-col cols="12" md="6">
                <v-text-field
                        v-model="skill.name"
                        hide-details
                        label="Название"
                ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
                <v-combobox
                        v-model="skill.groups"
                        :loading="loading"
                        label="Группы"
                        multiple
                        :search-input.sync="groupSearch"
                        :hide-no-data="!groupSearch"
                        :items="groups"
                        item-text="name"
                        hide-selected
                        return-object
                        chips
                        deletable-chips
                >
                    <template v-slot:no-data>
                        <v-list-item @click="addGroup(groupSearch)">
                            <span class="subheading mr-2">Добавить {{groupSearch}}</span>
                        </v-list-item>
                    </template>
                </v-combobox>
            </v-col>
        </v-row>
        <v-row>
            <v-switch v-model="skill.soft" label="Софт-скилл" class="ml-6 mt-0"></v-switch>
        </v-row>
    </v-container>
</template>

<script>
    import axios from "axios";

    export default {
        props: ['value'],
        data() {
            return {
                loading: false,
                groupSearch: null,
                apiGroups: [],
                newGroups: [],
                skill: Object.assign({}, this.value || {}),
            }
        },
        watch: {
            groupSearch() {
                return this.loadSkillGroups();
            },
            skill: {
                deep: true,
                handler() {
                    this.emitUpdates();
                }
            }
        },
        methods: {
            async loadSkillGroups() {
                let {data} = await axios.post('/api/skills/listGroups', {query: this.groupSearch});
                this.apiGroups = data.groups;
            },
            addGroup(groupName) {
                let newGroup = {name: groupName};
                let groupIndex = this.newGroups.findIndex(group => group.name === newGroup.name);
                if (groupIndex === -1) {
                    this.newGroups.push(newGroup);
                }
                else {
                    newGroup = this.newGroups[groupIndex];
                }

                if (!this.skill.groups) {
                    this.skill.groups = [];
                }

                this.skill.groups.push(newGroup);
                this.groupSearch = null;
                this.emitUpdates();
            },
            emitUpdates() {
                this.$emit('input', this.skill);
            }
        },
        computed: {
            groups() {
                return this.apiGroups.concat(this.newGroups);
            }
        }
    }
</script>

<style scoped>

</style>