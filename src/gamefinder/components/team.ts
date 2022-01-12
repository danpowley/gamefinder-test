import Vue, { ComponentOptions } from 'vue'
import Component from 'vue-class-component'
import Axios from 'axios'

@Component({
    template: `
            <div v-bind:class="[{fade: team.fade}]">
                <div class="division" v-if="team.showDivisionHeader">
                    {{ team.division }}
                </div>
                <div class="league" v-if="team.showLeagueHeader">
                    {{ team.league.name }}
                </div>
                <div v-bind:class="[{fade: team.fade,
                                     selected: team.selected,
                                     team: true}]"
                     v-on:click.prevent="selectTeam(team)"
                     v-on:mouseover="$emit('hover', $event, team)" v-on:mouseout="$emit('leave', $event, team)">
                    <img class="logo" :src="'/i/' + actualLogo(team)" />
                    <div class="name">{{ team.name }}</div>
                    <div class="info">TV {{ team.teamValue / 1000 }}k {{ team.race }}</div>
                </div>
            </div>
        `,
    props: {
        team: {
            type: Object,
            required: true
        }
    }
})
export default class TeamComponent extends Vue {
    actualLogo(team: any) {
        for (let l of team.raceLogos) {
            if (l.size === 32) {
                return l.logo
            }
        }
    }

    selectTeam(team: any) {
        this.$emit('select', team, !team.selected);
    }
}