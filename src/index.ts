import GameFinderApp from './gamefinder'
import Vue from 'vue'

new Vue({
    // @ts-ignore
    render: h => h(GameFinderApp),
}).$mount('#app')