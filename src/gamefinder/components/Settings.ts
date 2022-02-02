import Vue from 'vue';
import Component from 'vue-class-component';

@Component({
    template: `
        <div v-if="visible" class="settingsouter">
            <div class="settingsinner">
                <a href="#" class="closemodal" @click.prevent="close">&times;</a>
                <div class="settingstitle">Gamefinder settings for ALL teams</div>
                <div class="settingssection">
                    <div class="title"><strong>Hidden teams:</strong></div>
                    <div>No teams currently hidden.</div>
                </div>
                <div class="settingssection">
                    <div class="title"><strong>Hidden coaches:</strong></div>
                    <div>No coaches currently hidden.</div>
                </div>
            </div>
        </div>
    `,
    props: {
        modalSettings: {
            type: Object,
            required: true
        }
    }
})
export default class SettingsComponent extends Vue {
    public get visible() {
        return this.$props.modalSettings.settings;
    }

    private close() {
        this.$props.modalSettings.settings = false;
    }
}