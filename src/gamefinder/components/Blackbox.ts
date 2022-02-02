import Vue from 'vue';
import Component from 'vue-class-component';
import { Watch } from 'vue-property-decorator';
import Axios from 'axios';

@Component({
    template: `
        <div class="basicbox">
            <div class="header">Blackbox</div>
            <div class="content" id="blackboxwrapper">
                <div class="nextdraw">Next draw in <strong>~3 minutes</strong>.</div>
                <template v-if="displayIsActive">
                    <template v-if="availableBlackboxTeams === 0">
                        <div>To play in Blackbox you first need to create a team in the Competitive division.</div>
                    </template>
                    <template v-else>
                        <template v-if="chosenBlackboxTeams > 0">
                            <div class="teamsready">You have <strong>{{ chosenBlackboxTeams }} teams</strong> ready to join the draw ({{ availableBlackboxTeams }} eligible teams in total).</div>
                            <button>Join the draw</button>
                        </template>
                        <template v-else>
                            <div class="infonote">How to join? The first step is to select your teams using the &quot;Choose teams&quot; link on the right. Once your teams are selected you'll see a button here to join the next draw.</div>
                            <div class="infonote">Please note: only Competitive division teams can join Blackbox, you have {{ availableBlackboxTeams }} eligible teams in total.</div>
                        </template>
                    </template>
                </template>
                <template v-else>
                    Waiting for team choices to be made.
                </template>
            </div>
        </div>
    `,
    props: {
        displayIsActive: {
            type: Boolean,
            required: true
        }
    }
})
export default class LfgTeamsComponent extends Vue {
    private coachName: string | null = null;
    public availableBlackboxTeams: number = 0;
    public chosenBlackboxTeams: number = 0;

    async mounted() {
        this.coachName = document.getElementsByClassName('gamefinder')[0].getAttribute('coach');
        this.refresh();
    }

    @Watch('displayIsActive')
    onDisplayIsActiveChanged(newValue: boolean, oldValue: boolean) {
        if (newValue) {
            this.refresh();
        }
    }

    public async refresh() {
        this.cheatCreateCoach();
        const result = await Axios.post('/api/coach/teams/' + this.coachName);

        this.availableBlackboxTeams = 0;
        this.chosenBlackboxTeams = 0;

        for (const team of result.data.teams) {
            if (team.division === 'Competitive' && team.status === 'Active' && team.canLfg === 'Yes') {
                this.availableBlackboxTeams++;
                if (team.isLfg === 'Yes') {
                    this.chosenBlackboxTeams++;
                }
            }
        }
    }

    /**
    * Creates coach and teams (if already exist nothing happens)
    */
    private async cheatCreateCoach() {
        await Axios.post('/api/gamefinder/addcheatingcoach', {cheatingCoachName: this.coachName});
    }
}