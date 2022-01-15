class RandomData {
 
  constructor() {
  }

  getTeamName(divisionLetter, leagueName) {
    let leaguePrefix = divisionLetter
    if (leagueName) {
      const initials = leagueName.split(' ').reduce((prev, curr) => prev += curr.charAt(0), '');
      leaguePrefix = `${divisionLetter}:${initials}`
    }
    var randomWords = require('random-words');
    const teamEndings = ['Utd', 'Reavers', 'Steeds', 'Mavericks', 'Falcons', 'Spurs', 'Hawks']
    const teamWords = randomWords({min: 1, max: 2})
    teamWords.push(this.getArrayElement(teamEndings))
    const nameBody = teamWords.map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(' ')
    return `[${leaguePrefix}] ${nameBody}`
  }

  getInteger(max) {
    return Math.floor(Math.random() * max)
  }

  getId() {
    return this.getInteger(1000000)
  }

  getArrayElement(array) {
    return array[this.getInteger(array.length)]
  }

  getCoachLevels() {
    return ['Rookie', 'Veteran', 'Experienced', 'Emerging Star', 'Star', 'Super Star', 'Legend']
  }

  getCoachLevel() {
    return this.getArrayElement(this.getCoachLevels())
  }

  getYesNo() {
    return this.getArrayElement(['Yes', 'No'])
  }

  getTeamValue() {
    return (this.getInteger(120) + 80) * 10000
  }

  getRace() {
    const races = [
      {name: 'Amazon', imageId: 486194},
      {name: 'Black Orc', imageId: 641578},
      {name: 'Chaos Chosen', imageId: 486242},
      {name: 'Chaos Dwarf', imageId: 486248},
      {name: 'Chaos Renegade', imageId: 603759},
      {name: 'Dark Elf', imageId: 486254},
      {name: 'Dwarf', imageId: 486260},
      {name: 'Elven Union', imageId: 486266},
      {name: 'Goblin', imageId: 486272},
      {name: 'Halfling', imageId: 486278},
      {name: 'High Elf', imageId: 486284},
      {name: 'Human', imageId: 486290},
      {name: 'Imperial Nobility', imageId: 673306},
      {name: 'Khorne', imageId: 681363},
      {name: 'Lizardmen', imageId: 486302},
      {name: 'Necromantic Horror', imageId: 486308},
      {name: 'Norse', imageId: 486314},
      {name: 'Nurgle', imageId: 486320},
      {name: 'Ogre', imageId: 486326},
      {name: 'Old World Alliance', imageId: 637111},
      {name: 'Orc', imageId: 486332},
      {name: 'Shambling Undead', imageId: 486344},
      {name: 'Skaven', imageId: 486338},
      {name: 'Snotling', imageId: 643387},
      {name: 'Tomb Kings', imageId: 486296},
      {name: 'Underworld Denizens', imageId: 603383},
      {name: 'Vampire', imageId: 486350},
      {name: 'Wood Elf', imageId: 486356},
    ]
    return this.getArrayElement(races)
  }

  getTeam(coachName) {
    const race = this.getRace()
    const id = this.getId()
    return {
      id: id,
      coach: coachName,
      name: this.getTeamName('C', ''),
      isLfg: this.getYesNo(),
      canLfg: 'Yes',
      status: 'Active',
      teamValue: this.getTeamValue(),
      race: race.name,
      raceLogos: [
        {
          size: 32,
          logo: race.imageId
        },
      ],
      league: {
        valid: false
      },
      players: this.getPlayers(this.getInteger(6) + 10),
      rerolls: this.getInteger(5),
      fanFactor: this.getInteger(6),
      treasury: this.getInteger(30) * 10000,
      roster: {
        name: race.imageId
      },
      division: 'Competitive'
    }
  }

  getLeagueDivisionTeam(coachName) {
    const team = this.getTeam(coachName)
    team.name = this.getTeamName('L', ''),
    team.division = 'League'
    return team
  }

  getLeagueTeam(coachName, leagueObject) {
    const team = this.getTeam(coachName)
    team.name = this.getTeamName('L', leagueObject.name),
    team.division = 'League'
    team.league = leagueObject
    return team
  }

  getPlayers(playerCount) {
    const players = []
    for (let i = 0; i <= playerCount; i++) {
      players.push({
        injuries: this.getArrayElement(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '-MA', '-ST', '-PA', '-PA,-AG', 'N', 'N', 'N', 'N,-PA', 'N,N','N,-PA']),
        position: this.getArrayElement(['Catcher', 'Thrower', 'Blocker', 'Blitzer', 'Lineman', 'Lineman', 'Lineman', 'Lineman', 'Lineman']),
        skills: this.getArrayElement([[], [], [], [], [], [], ['Block'], ['Dodge'], ['Block', 'Dodge']])
      })
    }
    return players
  }
}

module.exports = RandomData