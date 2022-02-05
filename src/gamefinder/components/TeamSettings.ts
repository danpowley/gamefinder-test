import Vue from 'vue';
import Component from 'vue-class-component';
import { Util } from '../../core/util';

@Component({
    template: `
        <div v-if="team" class="teamsettingsouter">
            <div class="teamsettingsinner">
                <a href="#" class="closemodal" @click.prevent="close">&times;</a>
                <div class="settingstitle">Settings for: {{ abbreviate(team.name, 50) }}</div>
                <div class="settingssection">
                    <div class="title"><strong>Allowed CTV Range:</strong></div>
                    <div>Leave blank to use Gamefinder defaults.</div>
                    <div>
                        <label><input type="text" size=4> Under</label>
                    </div>
                    <div>
                        <label><input type="text" size=4> Over</label>
                    </div>
                </div>
                <button>Save changes</button> (maybe we don't want a Save button, just take any valid value as soon as its changed)
            </div>
        </div>
    `,
    props: {
        team: {
            validator: function (teamId) {
                return typeof teamId === 'object' || teamId === null;
            }
        }
    }
})
export default class TeamSettingsComponent extends Vue {
    private abbreviate(stringValue: string, maxCharacters: number) {
        return Util.abbreviate(stringValue, maxCharacters);
    }

    private close() {
        this.$emit('close-modal');
    }
}