class RandomData {
 
  constructor() {
  }

  getInteger(max) {
    return Math.floor(Math.random() * max)
  }
  
  getId() {
    return this.getInteger(1000000)
  }

  getTeam(coachName) {
    const id = this.getId()
    return {
      id: id,
      coach: coachName,
      name: 'Team' + id,
      isLfg: 'Yes',
      canLfg: 'Yes',
      status: 'Active',
      teamValue: 1230000,
      race: 'Tomb Kings',
      raceLogos: [
        {
          size: 32,
          logo: 486296
        },
      ],
      league: {
        valid: false
      },
      players: [
        {
          injuries: '-MA,-ST',
          position: 'Lineman',
          skills: ['Block', 'Dodge']
        }
      ],
      rerolls: 3,
      fanFactor: 4,
      treasury: 150000,
      roster: {
        name: 'Tomb King'
      },
    }
  }
}

module.exports = RandomData