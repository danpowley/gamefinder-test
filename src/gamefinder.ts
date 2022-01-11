import axios from 'axios'
import Vue from 'vue'

export default Vue.extend({
  name: 'GameFinderApp',
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
  created() {
    console.log('this was created')
  },
  methods: {
    doThing() {
      this.aNumber++;
      const coachName = 'Bob'
      const teamId = 234;
      const opponentTeamId = 562;

      const sampleData = {
        foo: 'Bar',
        baz: 'Bob'
      }

      const apiUrls = [
        '/api/team/get/' + teamId,
        '/api/coach/teams/' + coachName,
        '/api/gamefinder/teams',
        '/api/gamefinder/getoffers',
        '/api/gamefinder/activate',
        '/api/gamefinder/coachteams',
        `/api/gamefinder/offer/${teamId}/${opponentTeamId}`,
        '/api/gamefinder/addteam/' + teamId,
        '/api/gamefinder/removeteam/' + teamId,
        '/api/gamefinder/addallteams',
        '/api/gamefinder/removeallteams'
      ]

      for (const apiUrl of apiUrls) {
        // @ts-ignore
        axios.post(apiUrl, sampleData)
        .then(function (response) {
          console.log(response);
        })
        .catch(function (error) {
          console.log(error);
        });
      }
    }
  }
})