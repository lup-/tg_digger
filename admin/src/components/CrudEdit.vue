<script>
    export default {
        data() {
            return {
                item: {},

                ACTION_LOAD: 'crud/loadItems',
                ACTION_NEW: 'crud/newItem',
                ACTION_SAVE: 'crud/saveItem',
                ACTION_SET_EDIT_ITEM: 'crud/setEditItem',
                ROUTE_LIST: 'crudList',
                STORE_MODULE: 'crud',
                GETTER_NAME: 'crud/byId'
            }
        },
        async created() {
            if (this.itemId) {
                if (this.allItems.length === 0) {
                    await this.$store.dispatch(this.ACTION_LOAD);
                }

                if (this.storeItem) {
                    this.item = this.storeItem;
                }
            }
        },
        watch: {
            itemId() {
                this.$store.dispatch(this.ACTION_SET_EDIT_ITEM, this.itemId);
            },
            allItems: {
                deep: true,
                handler() {
                    if (this.itemId) {
                        this.$store.dispatch(this.ACTION_SET_EDIT_ITEM, this.itemId);
                    }
                }
            },
            storeItem() {
                if (this.storeItem) {
                    this.item = this.storeItem;
                }
            },
        },
        methods: {
            isNew() {
                return !(this.$route.params && this.$route.params.id);
            },
            async save() {
                if (this.isNew()) {
                    await this.$store.dispatch(this.ACTION_NEW, this.item);
                }
                else {
                    await this.$store.dispatch(this.ACTION_SAVE, this.item);
                }

                return this.gotoList();
            },
            gotoList() {
                return this.$router.push({name: this.ROUTE_LIST});
            }
        },
        computed: {
            itemId() {
                return this.$route.params && this.$route.params.id
                    ? this.$route.params.id || false
                    : false;
            },
            storeItem() {
                return this.$store.getters[this.GETTER_NAME](this.itemId);
            },
            allItems() {
                return this.$store.state[this.STORE_MODULE].list;
            },
        }
    }
</script>