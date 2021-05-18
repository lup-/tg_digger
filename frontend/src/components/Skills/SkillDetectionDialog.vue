<template>
    <v-form>
        <v-row dense>
            <v-col cols="12" class="pl-0">
                <v-combobox
                        v-model="skill.skills"
                        :hide-no-data="!search"
                        :items="skills"
                        :search-input.sync="search"
                        :loading="loading"
                        item-text="name"
                        return-object
                        hide-selected
                        label="Поиск навыков"
                        multiple
                        chips
                        deletable-chips
                        :open-on-clear="false"
                        @change="saveOnSelect"
                >
                    <template v-slot:no-data>
                        <v-list-item @click="addSkill(search)">
                            <span class="subheading mr-2">Добавить</span>
                            <skill-chip :skill="{name: search}"></skill-chip>
                        </v-list-item>
                    </template>
                </v-combobox>
                <v-list dense>
                    <v-list-item v-for="skill in skill.skills" :key="skill.name" class="px-0">
                        <v-list-item-content>
                            <skill-edit-form v-if="isItemEditing(skill)" v-model="editing"></skill-edit-form>
                            <v-container class="pa-0" v-else>
                                <skill-chip :skill="skill" class="mr-8"></skill-chip>
                                <v-chip small class="mr-2" v-for="group in skill.groups" :key="group.name">{{group.name}}</v-chip>
                            </v-container>
                        </v-list-item-content>
                        <v-list-item-action @click.stop class="my-0">
                            <v-btn v-if="isItemEditing(skill)" icon @click.stop.prevent="disableEditingItem()">
                                <v-icon>mdi-check</v-icon>
                            </v-btn>
                            <v-btn v-else icon @click.stop.prevent="setEditingItem(skill)">
                                <v-icon>mdi-pencil</v-icon>
                            </v-btn>
                        </v-list-item-action>
                    </v-list-item>
                </v-list>
            </v-col>
        </v-row>
    </v-form>
</template>

<script>
    import SkillChip from "@/components/Skills/SkillChip";
    import SkillEditForm from "@/components/Skills/SkillEditForm";
    import axios from "axios";

    export default {
        components: {SkillChip, SkillEditForm},
        props: ['value'],
        data() {
            return {
                editing: null,
                editingIndex: null,
                editingIndexInSkill: null,
                search: null,
                skills: [],
                loading: false,
                skill: Object.assign({}, this.value || {}),
            }
        },
        watch: {
            search() {
                return this.loadSkills();
            }
        },
        methods: {
            async loadSkills() {
                let {data} = await axios.post('/api/skills/listSkills', {query: this.search});
                this.skills = data.skills;
            },
            isItemEditing(item) {
                return this.skill.skills.indexOf(item) === this.editingIndexInSkill;
            },
            addSkill(text) {
                if (!this.skill.skills) {
                    this.skill.skills = [];
                }

                let newSkill = {name: text};

                this.skill.skills.push(newSkill);
                this.skills.push(newSkill);
                this.search = null;
            },
            setEditingItem(item) {
                this.editing = item;
                this.editingIndex = this.skills.indexOf(item);
                this.editingIndexInSkill = this.skill.skills.indexOf(item);
                this.$emit('unsaved', true);
            },
            disableEditingItem() {
                this.saveEditingSkill();
                this.editing = null;
                this.editingIndex = null;
                this.editingIndexInSkill = null;
                this.$emit('unsaved', false);
            },
            saveEditingSkill() {
                if (this.editingIndexInSkill !== -1) {
                    this.skill.skills[this.editingIndexInSkill] = this.editing;
                }

                if (this.editingIndex !== -1) {
                    this.skills[this.editingIndex] = this.editing;
                }

                this.commitUpdates();
                this.$emit('unsaved', false);
            },
            saveOnSelect() {
                this.search = null;
                this.commitUpdates();
            },
            commitUpdates() {
                this.$emit('input', this.skill);
            }

        }
    }
</script>

<style scoped>

</style>