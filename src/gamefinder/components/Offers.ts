import Vue from 'vue';
import Component from 'vue-class-component';
import Axios from 'axios';
import { Util } from '../../core/util';

@Component({
    template: `
        <div class="basicbox">
            <div class="header">Match Offers<div v-show="additionalOffers > 0" class="additionaloffers">Additional offers: {{ additionalOffers }}</div></div>
            <div class="content" id="offerlistwrapper">
                <div v-show="offers.length === 0" class="nooffers">Sorry, no current offers.</div>
                <div id="offerlist" @mouseenter="setUiUpdatesPaused(true)" @mouseleave="setUiUpdatesPaused(false)">
                    <div v-for="offer in offers" :key="offer.id" class="matchoffer">
                        <div class="icon external" v-show="offer.external">?</div>
                        <div class="icon accept" v-show="offer.external">&#x2714;</div>
                        <div class="icon cancel">&#x2718;</div>
                        <div class="offeredteam home">
                            <div class="name">
                                {{ abbreviate(offer.home.team, 30) }}
                            </div>
                            <div class="desc">
                                TV {{offer.home.tv}} {{offer.home.race}}
                            </div>
                        </div>
                        <div class="timer" :style="{ width: (100 * offer.timeRemaining / offer.lifetime) + '%', left: (50 - 50 * offer.timeRemaining / offer.lifetime) + '%'}"></div>
                        <div class="offeredteam away">
                            <div class="desc">
                                {{offer.away.race}} TV {{offer.away.tv}}
                            </div>
                            <div class="name">
                                {{ abbreviate(offer.away.team, 30) }}
                            </div>
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
        offers: {
            type: Array,
            required: true
        }
    }
})
export default class OffersComponent extends Vue {
    public additionalOffers: number = 0;
    public pendingOffers:any = [];

    private uiUpdatesPaused: boolean = false;

    async mounted() {
        setInterval(this.tick, 100);
        setInterval(this.getOffers, 1000);
    }

    public tick() {
        this.updateTimeRemaining();
        this.processOffers();
    }

    private updateTimeRemaining() {
        const now = Date.now();
        for (const o of this.$props.offers) {
            o.timeRemaining = o.expiry - now;
        }
    }

    private async getOffers() {
        const pre = Date.now();
        const offers: any = await Axios.post('/api/gamefinder/getoffers', {cheatingCoachName: this.$props.coachName});
        const now = Date.now();

        const avgTime = now / 2 + pre / 2;

        for (const offer of offers.data) {
            offer.expiry = avgTime + offer.timeRemaining;
            offer.external = offer.team1.coach.name !== this.$props.coachName
            // Swap teams if the first team is the opponent's
            if (offer.team2.coach.name === this.$props.coachName) {
                const x = offer.team1;
                offer.team1 = offer.team2;
                offer.team2 = x;
            }
            this.createOffer(offer);
        }
    }

    private processOffers() {
        const now = Date.now();

        // Process match offers
        for (let i = this.$props.offers.length - 1; i>=0; i--) {
            if (this.$props.offers[i].expiry < now) {
                this.$props.offers.splice(i, 1);
            }
        }

        if (! this.uiUpdatesPaused) {
            while(this.pendingOffers.length > 0) {
                const newOffer = this.pendingOffers.pop();

                let processed = false;
                for (const o of this.$props.offers) {
                    if (newOffer.id == o.id) {
                        processed = true;
                        // Update expiry time just to be sure.
                        o.timeRemaining = newOffer.expiry - now;
                        o.expiry = newOffer.expiry;
                    }
                }

                if (!processed) {
                    this.$props.offers.unshift(newOffer);
                }
            }
            this.additionalOffers = 0;
        } else {
            let num = 0;
            for (const pending of this.pendingOffers) {
                let found = false;
                for (const o of this.$props.offers) {
                    if (pending.id == o.id) {
                        found = true;
                    }
                }
                if (!found) {
                    num++;
                }
            }
            this.additionalOffers = num;
        }
    }

    private offerIsAlreadyPending(offerId: number): boolean {
        for (const pendingOffer of this.pendingOffers) {
            if (pendingOffer.id === offerId) {
                return true;
            }
        }
        return false;
    }

    private createOffer(offerData) {
        if (this.offerIsAlreadyPending(offerData.id)) {
            return;
        }

        let offer = {
            id: offerData.id,
            expiry: offerData.expiry,
            timeRemaining: offerData.timeRemaining,
            lifetime: offerData.lifetime,
            external: offerData.external,
            home: {
                id: offerData.team1.id,
                team: offerData.team1.name,
                race: offerData.team1.race.name,
                tv: (offerData.team1.teamValue / 1000) + 'k',
            },
            away: {
                id: offerData.team2.id,
                team: offerData.team2.name,
                race: offerData.team2.race.name,
                tv: (offerData.team2.teamValue / 1000) + 'k'
            }
        };

        this.pendingOffers.unshift(offer);
    }

    public setUiUpdatesPaused(isPaused: boolean) {
        this.uiUpdatesPaused = isPaused;
    }

    public abbreviate(stringValue: string, maxCharacters: number) {
        return Util.abbreviate(stringValue, maxCharacters);
    }
}