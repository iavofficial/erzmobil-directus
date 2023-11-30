import config from '../../config.js';
import SystemPush from './routes/systempush.vue';

export default {
    id: config.extension,
    name: 'SystemPush',
    icon: 'campaign',
    routes: [
        {
            path: '',
            redirect: '/' + config.extension + '/send'
        },
        {
            path: 'send',
            component: SystemPush
        }
    ],
    preRegisterCheck: function (user) {
        return user.role.admin_access === true || user.role.app_access;
    }
};