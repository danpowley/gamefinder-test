import Vue from 'vue';
import Component from 'vue-class-component';

@Component({
    template: `
        <div v-if="isOpen" class="settingsouter">
            <div class="settingsinner">
                <a href="#" class="closemodal" @click.prevent="close">&times;</a>
                <div class="settingstitle">Gamefinder settings for ALL teams</div>
                <div class="settingssection">
                    <div class="title"><strong>Hidden coaches:</strong></div>
                    <template v-if="hiddenCoaches.length === 0">
                        <div>No coaches currently hidden.</div>
                    </template>
                    <template v-else>
                        <div v-for="coachDetails in hiddenCoaches" :key="coachDetails.id"><a href="#" @click.prevent="unhideCoach(coachDetails.id)">unhide</a> {{ coachDetails.name }}</div>
                    </template>
                </div>
            </div>
        </div>
    `,
    props: {
        isOpen: {
            type: Boolean,
            required: true
        },
        hiddenCoaches: {
            type: Array,
            required: true
        }
    }
})
export default class SettingsComponent extends Vue {
    public coachNameToHide: string = '';

    public unhideCoach(id: number) {
        this.$emit('unhide-coach', id);
    }

    public close() {
        this.$emit('close-modal');
    }
}