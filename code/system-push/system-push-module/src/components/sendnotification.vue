<template>
    <div class="container vld-parent">
        <loading :active="isLoading" :can-cancel="false" :is-full-page="false"> </loading>

        <div class="notificationinputform">
            <v-input placeholder="Bitte verfasse hier deine Nachricht." v-model="notificationtext" />
        </div>

        <div class="notificationgroupselection">
            <v-select :items="items" v-model="groupselected" label="Standard" dense>{{ groupselected }}</v-select>
        </div>

        <div>
            <div class="notificationsendbutton">
                <v-button @click="sendNotification">Senden</v-button>
            </div>
        </div>

        <div v-if="isError">
            <h1 style="color: red">{{ errorMsg }}</h1>
        </div>


    </div>
</template>

<script>
import { postPushNotification } from '../api.js';
import Loading from "vue3-loading-overlay/dist/index";
import "vue3-loading-overlay/dist/vue3-loading-overlay.css";

export default {
    inject: ['api'],

    props: {

    },

    data: function () {
        return {
            items: ['KannBuchen', 'KannSehen','Busfahrer'],
            groupselected: '',
            notificationtext: '',
            isLoading: false,
            isError: false,
            errorMsg: 'An error occured! Please wait at least 1 minute until you try again.'
        }
    },

    components: {
        Loading,
    },

    methods: {
        async sendNotification() {
            this.isLoading = true;
            this.isError = false;

            var res = await postPushNotification(this.api, this.groupselected, this.notificationtext).then((resp) => {
                setTimeout(() => {
                    this.isLoading = false;
                }, 1200);
            }).catch((error) => {
                setTimeout(() => {
                    this.isLoading = false;
                    this.isError = true;
                    if (error.status == 401) {
                        this.errorMsg = 'Please try again in 1 minute.';
                    }

                }, 1200);
            });

        }
    }
}
</script>


<style scoped>
div.container {
    max-width: 50%;
    margin-left: 6%;
    /* margin: 40px auto; */
    /* padding: 0 15px; */
    display: grid;
    grid-template-rows: 1fr;
    grid-template-columns: 10fr 10fr 1fr;
}

div.notificationinputform {
    /* margin-left: 5%; */
    /* padding-right: 60px;
    min-height: 100px;
    min-width: 320px;
    width: auto;
    height: min-content; */
    padding: 5px;
}

div.notificationgroupselection {
    /* min-width: 250px; */
    padding: 5px;
}

div.notificationsendbutton {
    /* margin-right: 5%;
 */
    padding-top: 8px;
    /* padding-left: 40px; */
}


h2 {
    color: var(--foreground-normal-alt);
    font-weight: 700;
    font-size: 18px;
    font-family: var(--family-sans-serif);
    font-style: normal;
    line-height: 24px;
}

.v-notice {
    height: 36px;
    min-height: 36px;
}

.v-chip {
    --v-chip-color-hover: var(--v-chip-color);
    --v-chip-background-color-hover: var(--v-chip-background-color);
}

.v-chip.success {
    --v-chip-color: var(--success-alt);
    --v-chip-background-color: var(--success);
    --v-chip-color-hover: var(--success-alt);
    --v-chip-background-color-hover: var(--success);
}
</style>