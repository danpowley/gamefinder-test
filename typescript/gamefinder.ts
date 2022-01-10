// @ts-ignore
const App = Vue.extend({
  name: 'App',
  template: '<p>!{{ someValue }} {{ aNumber }}!<button @click="doThing">Do Thing</button></p>',
  components: {
  },
  data() {
    return {
      someValue: 'Hello World',
      aNumber: 1,
    }
  },
  computed: {
  },
  methods: {
    doThing() {
      this.aNumber++;
    }
  }
})