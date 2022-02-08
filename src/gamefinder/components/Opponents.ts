import Vue from 'vue';
import Component from 'vue-class-component';
import Axios from 'axios';
import { Util } from '../../core/util';
import GameFinderHelpers from '../GameFinderHelpers';

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
                    <span v-show="! isExpanded(opponent)"><a href="#" class="hidecoach" @click.prevent="hideCoach(opponent.id, opponent.name)">hide</a></span>
                </div>
                <div v-show="isExpanded(opponent)">
                    <div v-for="oppTeam in opponent.teams" v-if="oppTeam.visible" :key="oppTeam.id" class="team">
                        <div class="logo">
                            <img :src="getTeamLogoUrl(oppTeam)" />
                        </div>
                        <div class="details">
                            <div class="name">{{ abbreviate(oppTeam.name, 55) }}</div>
                            <div class="info">
                                <span v-show="isOfferedBySelectedOwnTeam(oppTeam)" class="offeredtag">Offered</span>
                                <!-- @christer, I've made up some values here oppTeam.currentSeason and oppTeam.gamesPlayedInSeason -->
                                <span title="Seasons and games played">S{{ oppTeam.currentSeason }}:G{{ oppTeam.gamesPlayedInSeason }}</span> TV {{ oppTeam.teamValue / 1000 }}k {{ oppTeam.race }}
                            </div>
                        </div>
                        <div class="links">
                            <template v-if="isOwnTeamSelected">
                                <template v-if="isOfferedBySelectedOwnTeam(oppTeam)">
                                    <span>Offered</span>
                                </template>
                                <template v-else>
                                    <a href="#" @click.prevent="sendOffer(oppTeam)">Offer</a>
                                </template>
                                <a href="#" @click.prevent="hideMatch(oppTeam.id)">Hide</a>
                            </template>
                            <a href="#" @click.prevent="openModal('ROSTER', {team: oppTeam})">Roster</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    props: {
        coachName: {
            type: String,
            required: true
        },
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
        selectedOwnTeamOfferedTeamIds: {
            type: Array,
            required: true
        }
    },
    watch: {
        // allow parent to trigger an opponents refresh (e.g. after changing teams that are LFG)
        opponentsRefreshRequired: function () {
            if (this.$props.opponentsRefreshRequired) {
                this.getOpponents();
                this.$emit('opponents-refreshed');
            }
        }
    }
})
export default class OpponentsComponent extends Vue {
    private uiUpdatesPaused: boolean = false;

    public opponents:any = {};
    public pendingOpponents: any = [];
    private opponentsNeedUpdate: boolean;
    public expandedForAllOpponents: number[] = [];

    // allow UI to update when offers are made, but before the main selectedOwnTeamOfferedTeamIds prop array has updated
    private recentOffers: {myTeamId: number, opponentTeamId: number, offerDate: number}[] = [];

    async mounted() {
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
            visible: true,
            teams: [{
                visible: false,
                selected: false
            }]
        }], this.$set);

        for(let i = data.length - 1; i >= 0; i--) {
            if (data[i].name === this.$props.coachName) {
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
                this.$emit('refresh');
                this.recentOffers = [];
            }
        }        
    }

    private sortOpponents() {
        this.opponents.sort((a,b) => a.name.localeCompare(b.name));
    }

    public get visibleOpponents(): any[] {
        const visibleOpponents = [];
        for (const opponent of this.opponents) {
            if (! opponent.visible) {
                continue;
            }
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
        await Axios.post('/api/gamefinder/offer/' + this.$props.selectedOwnTeam.id + '/' + team.id);
        this.recentOffers.push({myTeamId: this.$props.selectedOwnTeam.id, opponentTeamId: team.id, offerDate: Date.now()});
    }

    private hasRecentOffer(teamId) {
        for (const recentOfferDetails of this.recentOffers) {
            if (recentOfferDetails.offerDate > Date.now() - 5) {
                if (recentOfferDetails.myTeamId === this.$props.selectedOwnTeam.id && recentOfferDetails.opponentTeamId === teamId) {
                    return true;
                }
            }
        }
        return false;
    }

    public isOfferedBySelectedOwnTeam(team) {
        if (this.hasRecentOffer(team.id)) {
            return true;
        }

        return this.$props.selectedOwnTeamOfferedTeamIds.includes(team.id);
    }

    public setUiUpdatesPaused(isPaused: boolean) {
        this.uiUpdatesPaused = isPaused;
    }

    public hideMatch(opponentTeamId) {
        if (! this.$props.selectedOwnTeam) {
            return;
        }

        this.$emit('hide-match', this.$props.selectedOwnTeam, opponentTeamId);
    }

    public hideCoach(id: number, name: string) {
        this.$emit('hide-coach', id, name);
    }

    public openModal(name: string, modalSettings: any) {
        this.$emit('open-modal', name, modalSettings);
    }

    public abbreviate(stringValue: string, maxCharacters: number) {
        return Util.abbreviate(stringValue, maxCharacters);
    }

    public getTeamLogoUrl(team: any): string {
        return GameFinderHelpers.getTeamLogoUrl(team);
    }
}