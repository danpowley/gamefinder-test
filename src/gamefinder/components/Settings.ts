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
                    <div style="margin-bottom: 20px;">
                        <input type="text" width="20" placeholder="Coach name" v-model="coachNameToHide"> <button @click="hideCoach">Hide Coach</button>
                    </div>
                    <template v-if="hiddenCoaches.length === 0">
                        <div>No coaches currently hidden.</div>
                    </template>
                    <template v-else>
                        <div v-for="coachName in hiddenCoaches" :key="coachName"><a href="#" @click="unhideCoach(coachName)">clear</a> {{ coachName }}</div>
                    </template>
                </div>
            </div>
        </div>
    `,
    props: {
        isOpen: {
            type: Boolean,
            required: true
        }
    }
})
export default class SettingsComponent extends Vue {
    public coachNameToHide: string = '';
    public hiddenCoaches: string[] = [];

    public hideCoach() {
        if (! this.coachNameToHide || this.hiddenCoaches.includes(this.coachNameToHide)) {
            this.coachNameToHide = '';
            return;
        }
        this.hiddenCoaches.push(this.coachNameToHide);
        this.coachNameToHide = '';
    }

    public unhideCoach(unhideCoachName) {
        this.hiddenCoaches = this.hiddenCoaches.filter((coachName) => coachName !== unhideCoachName);
    }

    public close() {
        this.$emit('close-modal');
    }
}