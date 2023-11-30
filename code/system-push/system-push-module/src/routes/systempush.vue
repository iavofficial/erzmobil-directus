<template>
    <private-view title="Systembenachrichtigungen versenden">
        <template #headline>Systempush</template>

        <template #title-outer:prepend>
            <v-button class="header-icon" rounded disabled icon secondary>
                <v-icon name="campaign" />
            </v-button>
        </template>

        <!-- Loading -->
        <div v-if="loading" style="margin: 25px auto; max-width: 50px">
            <v-progress-circular indeterminate />
        </div>

        <!-- Send Notification -->
        <SendNotification v-if="!loading">

        </SendNotification>

    </private-view>
</template>

<script>

import SendNotification from '../components/sendnotification.vue';

export default {
    inject: ['api'],
    components: { SendNotification },
}
</script>