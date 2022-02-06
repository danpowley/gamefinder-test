import Vue from 'vue';
import Component from 'vue-class-component';

@Component({
    template: `
        <div class="basicbox">
            <div class="header">Blackbox</div>
            <div class="content" id="blackboxwrapper">
                <div class="nextdraw">Next draw in <strong>~3 minutes</strong>.</div>
                <template v-if="displayIsActive">
                    <template v-if="available === 0">
                        <div>To play in Blackbox you first need to create a team in the Competitive division.</div>
                    </template>
                    <template v-else>
                        <template v-if="chosen > 0">
                            <div class="teamsready">You have <strong>{{ chosen }} teams</strong> ready to join the draw ({{ available }} eligible teams in total).</div>
                            <button>Join the draw</button>
                        </template>
                        <template v-else>
                            <div class="infonote">How to join? The first step is to select your teams using the &quot;Choose teams&quot; link on the right. Once your teams are selected you'll see a button here to join the next draw.</div>
                            <div class="infonote">Please note: only Competitive division teams can join Blackbox, you have {{ available }} eligible teams in total.</div>
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
        },
        available: {
            type: Number,
            required: true
        },
        chosen: {
            type: Number,
            required: true
        }
    }
})
export default class BlackboxComponent extends Vue {
}