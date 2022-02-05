import Vue from 'vue';
import Component from 'vue-class-component';
import Axios from 'axios';
import { Util } from '../../core/util';

@Component({
    template: `
        <div id="opponentslist" @mouseenter="setUiUpdatesPaused(true)" @mouseleave="setUiUpdatesPaused(false)">
            <div class="expandcollapseall" v-show="visibleOpponents.length > 0"><a href="#" @click.prevent="expandAllOpponents()">Expand</a> <a href="#" @click.prevent="collapseAllOpponents()">Collapse</a></div>
            <div>
                <strong>{{ isOwnTeamSelected ? 'Opponents filtered by selected team.' : 'All opponents on Gamefinder' }}</strong>
                <span
                    v-show="uiUpdatesPaused"
                    class="frozentag"
                    title="New opponents won't be added/removed until you move your mouse away from this area. This is to prevent the page moving whilst you browse opponents."
                    >Frozen</span>
            </div>
            <div v-show="visibleOpponents.length === 0">No opponents available.</div>
            <div v-for="opponent in visibleOpponents" :key="opponent.id" class="opponent">
                <div class="coach">
                    <a class="disclosure" @click.prevent="expandOpponent(opponent)" href="#">
                        <span class="showhideicon" v-if="isExpanded(opponent)">&#x25bc;</span>
                        <span class="showhideicon" v-else>&#x25b6;</span>
                        <span class="teamcount" title="Teams listed for this opponent">{{ opponent.teams.filter((o) => o.visible).length }}</span>
                        {{ opponent.name }}
                    </a>
                    <span class="ranking">
                        {{ opponent.ranking }}
                    </span>
                </div>
                <div v-show="isExpanded(opponent)">
                    <div v-for="oppTeam in opponent.teams" v-if="oppTeam.visible" :key="oppTeam.id" class="team">
                        <div class="logo">
                            <img :src="'https://fumbbl.com/i/' + oppTeam.raceLogos[0].logo" />
                        </div>
                        <div class="details">
                            <div class="name">{{ abbreviate(oppTeam.name, 55) }}</div>
                            <div class="info">
                                <span v-show="hasOfferFromSelectedOwnTeam(oppTeam)" class="offeredtag">Offered</span>
                                <span title="Seasons and games played">S{{ oppTeam.currentSeason }}:G{{ oppTeam.gamesPlayedInSeason }}</span> TV {{ oppTeam.teamValue / 1000 }}k {{ oppTeam.race }}
                            </div>
                        </div>
                        <div class="links">
                            <template v-if="isOwnTeamSelected">
                                <template v-if="hasOfferFromSelectedOwnTeam(oppTeam)">
                                    <span>Offered</span>
                                </template>
                                <template v-else>
                                    <a href="#" @click.prevent="sendOffer(oppTeam)">Offer</a>
                                </template>
                                <a href="#">Hide</a>
                            </template>
                            <a href="#" @click.prevent="openModal('ROSTER', {team: oppTeam})">Roster</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    props: {
        opponentMap: {
            type: Map,
            required: true
        },
        opponentsRefreshRequired: {
            type: Boolean,
            required: true
        },
        selectedOwnTeam: {
            validator: function (team) {
                return typeof team === 'object' || team === null;
            }
        },
        opponentTeamIdsWithOffersFromSelectedOwnTeam: {
            type: Array,
            required: true
        }
    },
    watch: {
        opponentsRefreshRequired: function () {
            if (this.$props.opponentsRefreshRequired) {
                this.getOpponents();
                this.$emit('opponents-refreshed');
            }
        }
    }
})
export default class OpponentsComponent extends Vue {
    private coachName: string | null = null;

    private uiUpdatesPaused: boolean = false;

    public opponents:any = {};
    public pendingOpponents: any = [];
    private opponentsNeedUpdate: boolean;
    public expandedForAllOpponents: number[] = [];

    async mounted() {
        this.coachName = document.getElementsByClassName('gamefinder')[0].getAttribute('coach');

        await this.getOpponents();

        setInterval(this.processOpponents, 100);
        setInterval(this.getOpponents, 5000);
    }

    private get isOwnTeamSelected(): boolean {
        return this.$props.selectedOwnTeam !== null;
    }

    private async getOpponents() {
        const result = await Axios.post('/api/gamefinder/teams')

        const data = result.data;

        Util.applyDeepDefaults(data, [{
            visibleTeams: 0,
            expanded: false,
            teams: [{
                visible: false,
                selected: false
            }]
        }], this.$set);

        for(let i = data.length - 1; i >= 0; i--) {
            if (data[i].name === this.coachName) {
                data.splice(i, 1);
            }
        }

        this.pendingOpponents = data;
        this.opponentsNeedUpdate = true;
        this.processOpponents();
    }

    private processOpponents() {
        // Process updated opponent list
        if (this.opponentsNeedUpdate) {
            this.opponentsNeedUpdate = false;
            if (! this.uiUpdatesPaused) {
                // Mark all current opponents as dirty
                this.$props.opponentMap.forEach((o, k) => {
                    this.$props.opponentMap.get(k).dirty = true;
                });

                let r = {};
                for (let p of this.pendingOpponents) {
                    r[p.name] = p;
                }

                for (let k in r) {
                    if (! this.$props.opponentMap.has(k)) {
                        // New coach
                        r[k].dirty = false;
                        this.$props.opponentMap.set(k, r[k]);
                    } else {
                        // Coach is already on the list, so make sure it's kept there.
                        let opp = this.$props.opponentMap.get(k)
                        opp.dirty = false;

                        // Update teams

                        // Generate map and mark as dirty
                        let teamMap = {};
                        for (let t in opp.teams) {
                            let team = opp.teams[t];
                            team.dirty = true;
                            teamMap[team.id] = team;
                        }

                        r[k].teams.forEach(t => {
                            if (teamMap[t.id] == undefined) {
                                // new team, add it
                                teamMap[t.id] = t;
                                t.dirty = false;
                            } else {
                                // Existing team, mark it as clean
                                teamMap[t.id].dirty = false;
                            }
                        });

                        // Remove teams that are no longer on the list
                        for (let i=opp.teams.length - 1; i>=0; i--) {
                            if (opp.teams[i].dirty) {
                                delete teamMap[opp.teams[i].id];
                                opp.teams.splice(i, 1);
                            } else {
                                // Need to update the stats.. Might have changed
                                let existingTeam = opp.teams[i];
                                existingTeam.teamValue = teamMap[existingTeam.id].teamValue;
                                existingTeam.gamesPlayed = teamMap[existingTeam.id].gamesPlayed;

                                // Remove team from pending list
                                delete teamMap[existingTeam.id];
                            }
                        }

                        // Add new teams.
                        for (let k in teamMap) {
                            opp.teams.push(teamMap[k]);
                        }
                    }
                }

                // Remove opponent coaches that aren't present anymore
                this.$props.opponentMap.forEach((o, key) => {
                    if (o.dirty) {
                        this.$props.opponentMap.delete(key);
                    }
                });

                // Store collapsed state of coaches
                const collapsed: Array<string> = [];
                for (let o of this.opponents) {
                    if (! o.expanded) {
                        collapsed.push(o.name);
                    }
                }

                // Generate new opponents structure
                let newOpponents = [];
                this.$props.opponentMap.forEach(o => {
                    newOpponents.push(o);
                    // Expand unless the coach was explicitly collapsed (allow new coaches to be expanded by default)
                    o.expanded = collapsed.indexOf(o.name) === -1;
                });

                this.opponents = newOpponents;
                this.pendingOpponents = [];
                this.sortOpponents();
                this.refresh();
            }
        }        
    }

    private sortOpponents() {
        this.opponents.sort((a,b) => a.name.localeCompare(b.name));
    }

    public get visibleOpponents(): any[] {
        const visibleOpponents = [];
        for (const opponent of this.opponents) {
            if (opponent.visibleTeams > 0) {
                visibleOpponents.push(opponent);
            }
        }
        return visibleOpponents;
    }

    public expandOpponent(opponent) {
        if (this.isOwnTeamSelected) {
            // We have selected a team, so we can use the property directly on the opponent.
            opponent.expanded = !opponent.expanded;
        } else {
            // No team selected, so we store the expanded state separately.
            let index = this.expandedForAllOpponents.indexOf(opponent.id);
            if (index !== -1) {
                this.expandedForAllOpponents.splice(index, 1);
            } else {
                this.expandedForAllOpponents.push(opponent.id);
            }
        }
    }

    public expandAllOpponents() {
        if (this.isOwnTeamSelected) {
            for (const visibleOpponent of this.visibleOpponents) {
                visibleOpponent.expanded = true;
            }
        } else {
             this.expandedForAllOpponents = Array.from(this.$props.opponentMap.values()).map((o:any) => o.id);
        }
    }

    public collapseAllOpponents() {
        if (this.isOwnTeamSelected) {
            for (const visibleOpponent of this.visibleOpponents) {
                visibleOpponent.expanded = false;
            }
        } else {
             this.expandedForAllOpponents = [];
        }
    }

    public isExpanded(opponent) {
        if (this.isOwnTeamSelected) {
            return opponent.expanded;
        } else {
            return this.expandedForAllOpponents.includes(opponent.id);
        }
    }

    public async sendOffer(team) {
        let ownId = parseInt(this.$props.selectedOwnTeam.id);
        let oppId = parseInt(team.id);
        await Axios.post('/api/gamefinder/offer/' + ownId + '/' + oppId);

        // add the opponent team id to give an instant UI update (this value will also be set by the general refresh process)
        this.$props.opponentTeamIdsWithOffersFromSelectedOwnTeam.push(oppId);
    }

    private hasOfferFromSelectedOwnTeam(team) {
        return this.$props.opponentTeamIdsWithOffersFromSelectedOwnTeam.includes(team.id);
    }

    public refresh() {
        this.$emit('refresh');
    }

    public setUiUpdatesPaused(isPaused: boolean) {
        this.uiUpdatesPaused = isPaused;
    }

    public openModal(name: string, modalSettings: any) {
        this.$emit('open-modal', name, modalSettings);
    }

    private abbreviate(stringValue: string, maxCharacters: number) {
        return Util.abbreviate(stringValue, maxCharacters);
    }
}