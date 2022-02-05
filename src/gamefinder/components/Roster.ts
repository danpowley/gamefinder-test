import Vue from 'vue';
import Component from 'vue-class-component';
import Axios from 'axios';
import { Util } from '../../core/util';

@Component({
    template: `
        <div v-if="rosterData" class="rosterouter">
            <div class="rosterinner">
                <a href="#" class="closemodal" @click.prevent="close">&times;</a>
                <div class="rosterinfo">{{ abbreviate(rosterData.name, 60) }}, TV {{ rosterData.teamValue/1000 }}k</div>
                <div class="teaminfo">{{ rosterData.rerolls }} RR, {{rosterData.fanFactor}} FF, {{ rosterData.treasury/1000 }}k gold</div>
                <table cellspacing="0" cellpadding="0" width="100%">
                <tr v-for="player in rosterData.players">
                    <td class="position">{{ player.position }}</td><td class="injuries">{{ player.injuries }}</td><td>{{ player.skills }}</td>
                </tr>
                </table>
            </div>
        </div>
    `,
    props: {
        team: {
            validator: function (team) {
                return typeof team === 'object' || team === null;
            }
        }
    },
    watch: {
        team: function () {
            return this.loadRosterData();
        }
    }
})
export default class RosterComponent extends Vue {
    private rosterData = null;
    private rosterCache:any = {};

    private async loadRosterData() {
        if (this.$props.team === null) {
            this.rosterData = null;
            return;
        }

        const rosterData = await this.getRoster(this.$props.team.id);
        this.rosterData = rosterData;
    }

    private close() {
        this.$emit('close-modal');
    }

    private async getRoster(teamId) {
        let data = this.rosterCache[teamId];

        if (this.rosterCache[teamId] != undefined) {
            if (data.expiry < Date.now()) {
                data = undefined;
            }
        }
        if (data == undefined) {
            const result = await Axios.post('/api/team/get/'+teamId);

            for (const p of result.data.players) {
                p.skills.sort((a,b) => a.localeCompare(b));
                p.skills = p.skills.join(', ');
            }

            result.data.players.sort((a,b) => {
                let r = a.position.localeCompare(b.position);
                if (r == 0) {
                    r = b.skills.length - a.skills.length;
                }
                return r;
            });

            data = {
                expiry: Date.now() + 60000,
                roster: result.data,
            }
            this.rosterCache[teamId] = data;
        }

        return data.roster;
    }

    private abbreviate(stringValue: string, maxCharacters: number) {
        return Util.abbreviate(stringValue, maxCharacters);
    }
}