import { validateFixtureCollection } from "@/lib/f1/domain/validateFixtureCollection";

const ids = {
  sourceF1British: "00000000-0000-4000-8000-000000000001",
  sourceFiaBritish: "00000000-0000-4000-8000-000000000002",
  sourceF1HamiltonVideo: "00000000-0000-4000-8000-000000000003",
  sourceF1VerstappenVideo: "00000000-0000-4000-8000-000000000004",
  sourceF1Dutch: "00000000-0000-4000-8000-000000000005",
  sourceF1DutchVideo: "00000000-0000-4000-8000-000000000006",
  season2024: "10000000-0000-4000-8000-000000000001",
  season2023: "10000000-0000-4000-8000-000000000002",
  silverstone: "20000000-0000-4000-8000-000000000001",
  zandvoort: "20000000-0000-4000-8000-000000000002",
  britishGp: "30000000-0000-4000-8000-000000000001",
  dutchGp: "30000000-0000-4000-8000-000000000002",
  britishSession: "40000000-0000-4000-8000-000000000001",
  dutchSession: "40000000-0000-4000-8000-000000000002",
  britishRace: "50000000-0000-4000-8000-000000000001",
  dutchRace: "50000000-0000-4000-8000-000000000002",
  hamilton: "60000000-0000-4000-8000-000000000001",
  norris: "60000000-0000-4000-8000-000000000002",
  verstappen: "60000000-0000-4000-8000-000000000003",
  perez: "60000000-0000-4000-8000-000000000004",
  mercedes: "70000000-0000-4000-8000-000000000001",
  mclaren: "70000000-0000-4000-8000-000000000002",
  redBull: "70000000-0000-4000-8000-000000000003",
  hamiltonMoment: "80000000-0000-4000-8000-000000000001",
  verstappenMoment: "80000000-0000-4000-8000-000000000002",
  dutchMoment: "80000000-0000-4000-8000-000000000003",
  pitWindowConcept: "90000000-0000-4000-8000-000000000001",
  tyreChoiceConcept: "90000000-0000-4000-8000-000000000002",
} as const;

const retrievedAt = "2026-08-17T12:00:00Z";

export const canonicalRaceFixtures = validateFixtureCollection({
  schemaVersion: 1,
  sources: [
    { id: ids.sourceF1British, provider: "f1", kind: "officialReport", title: "Hamilton beats Verstappen to record ninth British Grand Prix win", url: "https://www.formula1.com/en/latest/article/hamilton-beats-verstappen-to-first-win-since-2021-with-record-breaking-9th.3teU9bznaWJlC2TGAYh0Vl.3teU9bznaWJlC2TGAYh0Vl", retrievedAt },
    { id: ids.sourceFiaBritish, provider: "fia", kind: "officialReport", title: "Hamilton takes record-breaking ninth win at Silverstone", url: "https://www.fia.com/news/f1-hamilton-takes-emotional-record-breaking-ninth-win-silverstone-ahead-verstappen-and-norris", retrievedAt },
    { id: ids.sourceF1HamiltonVideo, provider: "f1", kind: "video", title: "Hamilton re-takes the lead after pitting ahead of Norris", url: "https://www.formula1.com/en/video/2024-british-grand-prix-hamilton-re-takes-the-lead-after-pitting-ahead-of-norris.1803934075419823982", retrievedAt },
    { id: ids.sourceF1VerstappenVideo, provider: "f1", kind: "video", title: "Verstappen powers past Norris for P2", url: "https://www.formula1.com/en/video/2024-british-grand-prix-verstappen-powers-past-norris-for-p2.1803935535997055584", retrievedAt },
    { id: ids.sourceF1Dutch, provider: "f1", kind: "officialReport", title: "Verstappen overcomes wet-weather chaos at the Dutch Grand Prix", url: "https://www.formula1.com/en/latest/article/verstappen-overcomes-wet-weather-chaos-to-make-it-a-hat-trick-of-dutch-gp.4VJ0ULOqjodSSN1zC6kWui", retrievedAt },
    { id: ids.sourceF1DutchVideo, provider: "f1", kind: "video", title: "Rain causes early drama at the 2023 Dutch Grand Prix", url: "https://www.formula1.com/en/latest/article/race-start-watch-the-exciting-start-from-the-dutch-grand-prix-as-rain-causes.5Vz4wfEMT9xrrkxjkZJiH", retrievedAt },
  ],
  seasons: [
    { id: ids.season2024, year: 2024, sourceIds: [ids.sourceF1British] },
    { id: ids.season2023, year: 2023, sourceIds: [ids.sourceF1Dutch] },
  ],
  circuits: [
    { id: ids.silverstone, slug: "silverstone", name: "Silverstone Circuit", locality: "Silverstone", country: "United Kingdom", countryCode: "GBR", sourceIds: [ids.sourceF1British] },
    { id: ids.zandvoort, slug: "zandvoort", name: "Circuit Zandvoort", locality: "Zandvoort", country: "Netherlands", countryCode: "NLD", sourceIds: [ids.sourceF1Dutch] },
  ],
  grandsPrix: [
    { id: ids.britishGp, seasonId: ids.season2024, circuitId: ids.silverstone, round: 12, officialName: "Formula 1 Qatar Airways British Grand Prix 2024", shortName: "British Grand Prix", startDate: "2024-07-05", endDate: "2024-07-07", sourceIds: [ids.sourceF1British, ids.sourceFiaBritish] },
    { id: ids.dutchGp, seasonId: ids.season2023, circuitId: ids.zandvoort, round: 13, officialName: "Formula 1 Heineken Dutch Grand Prix 2023", shortName: "Dutch Grand Prix", startDate: "2023-08-25", endDate: "2023-08-27", sourceIds: [ids.sourceF1Dutch] },
  ],
  sessions: [
    { id: ids.britishSession, grandPrixId: ids.britishGp, type: "race", name: "Race", startsAt: "2024-07-07T14:00:00Z", endsAt: "2024-07-07T16:00:00Z", sourceIds: [ids.sourceF1British, ids.sourceFiaBritish] },
    { id: ids.dutchSession, grandPrixId: ids.dutchGp, type: "race", name: "Race", startsAt: "2023-08-27T13:00:00Z", endsAt: "2023-08-27T15:30:00Z", sourceIds: [ids.sourceF1Dutch] },
  ],
  races: [
    { id: ids.britishRace, grandPrixId: ids.britishGp, sessionId: ids.britishSession, status: "completed", scheduledLaps: 52, actualLaps: 52, startedAt: "2024-07-07T14:00:00Z", endedAt: "2024-07-07T15:22:27Z", sourceIds: [ids.sourceF1British, ids.sourceFiaBritish] },
    { id: ids.dutchRace, grandPrixId: ids.dutchGp, sessionId: ids.dutchSession, status: "completed", scheduledLaps: 72, actualLaps: 72, startedAt: "2023-08-27T13:00:00Z", sourceIds: [ids.sourceF1Dutch] },
  ],
  drivers: [
    { id: ids.hamilton, slug: "lewis-hamilton", givenName: "Lewis", familyName: "Hamilton", code: "HAM", permanentNumber: 44, nationality: "British", sourceIds: [ids.sourceF1British] },
    { id: ids.norris, slug: "lando-norris", givenName: "Lando", familyName: "Norris", code: "NOR", permanentNumber: 4, nationality: "British", sourceIds: [ids.sourceF1British] },
    { id: ids.verstappen, slug: "max-verstappen", givenName: "Max", familyName: "Verstappen", code: "VER", permanentNumber: 1, nationality: "Dutch", sourceIds: [ids.sourceF1British, ids.sourceF1Dutch] },
    { id: ids.perez, slug: "sergio-perez", givenName: "Sergio", familyName: "Perez", code: "PER", permanentNumber: 11, nationality: "Mexican", sourceIds: [ids.sourceF1Dutch] },
  ],
  teams: [
    { id: ids.mercedes, slug: "mercedes", canonicalName: "Mercedes", sourceIds: [ids.sourceF1British] },
    { id: ids.mclaren, slug: "mclaren", canonicalName: "McLaren", sourceIds: [ids.sourceF1British] },
    { id: ids.redBull, slug: "red-bull-racing", canonicalName: "Red Bull Racing", sourceIds: [ids.sourceF1British, ids.sourceF1Dutch] },
  ],
  teamSeasonIdentities: [
    { id: "71000000-0000-4000-8000-000000000001", teamId: ids.mercedes, seasonId: ids.season2024, displayName: "Mercedes", constructorName: "Mercedes", nationality: "German", validFrom: "2024-01-01", validTo: "2024-12-31", sourceIds: [ids.sourceF1British] },
    { id: "71000000-0000-4000-8000-000000000002", teamId: ids.mclaren, seasonId: ids.season2024, displayName: "McLaren", constructorName: "McLaren Mercedes", nationality: "British", validFrom: "2024-01-01", validTo: "2024-12-31", sourceIds: [ids.sourceF1British] },
    { id: "71000000-0000-4000-8000-000000000003", teamId: ids.redBull, seasonId: ids.season2024, displayName: "Red Bull Racing", constructorName: "Red Bull Racing Honda RBPT", nationality: "Austrian", validFrom: "2024-01-01", validTo: "2024-12-31", sourceIds: [ids.sourceF1British] },
    { id: "71000000-0000-4000-8000-000000000004", teamId: ids.redBull, seasonId: ids.season2023, displayName: "Red Bull Racing", constructorName: "Red Bull Racing Honda RBPT", nationality: "Austrian", validFrom: "2023-01-01", validTo: "2023-12-31", sourceIds: [ids.sourceF1Dutch] },
  ],
  driverTeamMemberships: [
    { id: "72000000-0000-4000-8000-000000000001", driverId: ids.hamilton, teamId: ids.mercedes, seasonId: ids.season2024, carNumber: 44, validFrom: "2024-01-01", validTo: "2024-12-31", sourceIds: [ids.sourceF1British] },
    { id: "72000000-0000-4000-8000-000000000002", driverId: ids.norris, teamId: ids.mclaren, seasonId: ids.season2024, carNumber: 4, validFrom: "2024-01-01", validTo: "2024-12-31", sourceIds: [ids.sourceF1British] },
    { id: "72000000-0000-4000-8000-000000000003", driverId: ids.verstappen, teamId: ids.redBull, seasonId: ids.season2024, carNumber: 1, validFrom: "2024-01-01", validTo: "2024-12-31", sourceIds: [ids.sourceF1British] },
    { id: "72000000-0000-4000-8000-000000000004", driverId: ids.verstappen, teamId: ids.redBull, seasonId: ids.season2023, carNumber: 1, validFrom: "2023-01-01", validTo: "2023-12-31", sourceIds: [ids.sourceF1Dutch] },
    { id: "72000000-0000-4000-8000-000000000005", driverId: ids.perez, teamId: ids.redBull, seasonId: ids.season2023, carNumber: 11, validFrom: "2023-01-01", validTo: "2023-12-31", sourceIds: [ids.sourceF1Dutch] },
  ],
  moments: [
    {
      id: ids.hamiltonMoment, raceId: ids.britishRace, sessionId: ids.britishSession, slug: "hamilton-times-final-stop", type: "strategyChange", status: "curated", title: "Hamilton times the switch back to slicks", summary: "Hamilton stopped for soft tyres on lap 38; Norris stopped a lap later and emerged behind him.", lapNumber: 39, sequence: 1, importance: 5,
      drivers: [{ entityId: ids.hamilton, role: "primary" }, { entityId: ids.norris, role: "affected" }], teams: [{ entityId: ids.mercedes, role: "primary" }, { entityId: ids.mclaren, role: "affected" }],
      evidence: [
        { id: "81000000-0000-4000-8000-000000000001", type: "pitStop", lap: 38, driverId: ids.hamilton, tyreCompound: "soft", sourceIds: [ids.sourceF1British] },
        { id: "81000000-0000-4000-8000-000000000002", type: "pitStop", lap: 39, driverId: ids.norris, tyreCompound: "soft", stationaryDurationSeconds: 4.5, sourceIds: [ids.sourceF1British] },
      ],
      concepts: [{ id: ids.pitWindowConcept, slug: "pit-window", name: "Pit window", category: "strategy" }],
      explanation: { whatHappened: "Hamilton changed to soft slicks one lap before Norris and moved ahead when Norris completed his stop.", whyItHappened: "Mercedes committed as the circuit became ready for slick tyres, while McLaren kept Norris out for one more lap.", whyItMatters: "The timing changed the lead of the race and put Hamilton in position to win.", watchNext: "When conditions change, watch who pits first and whether the next lap costs the following car track position.", conceptIds: [ids.pitWindowConcept], sourceIds: [ids.sourceF1British, ids.sourceFiaBritish] },
      connections: [{ targetMomentId: ids.dutchMoment, reason: "similarStrategy", explanation: "Both moments show how one extra lap on the wrong tyre for changing conditions can cost track position.", sourceIds: [ids.sourceF1British, ids.sourceF1Dutch] }],
      media: [{ id: "82000000-0000-4000-8000-000000000001", provider: "officialF1", kind: "video", title: "Hamilton re-takes the lead after pitting ahead of Norris", url: "https://www.formula1.com/en/video/2024-british-grand-prix-hamilton-re-takes-the-lead-after-pitting-ahead-of-norris.1803934075419823982", attribution: "Formula 1", sourceIds: [ids.sourceF1HamiltonVideo] }], sourceIds: [ids.sourceF1British, ids.sourceFiaBritish],
    },
    {
      id: ids.verstappenMoment, raceId: ids.britishRace, sessionId: ids.britishSession, slug: "verstappen-hard-tyre-recovery", type: "overtake", status: "curated", title: "Verstappen's hard tyres come alive", summary: "Verstappen chose hard tyres on lap 38 and passed Norris for second on lap 48.", lapNumber: 48, sequence: 2, importance: 4,
      drivers: [{ entityId: ids.verstappen, role: "primary" }, { entityId: ids.norris, role: "secondary" }], teams: [{ entityId: ids.redBull, role: "primary" }, { entityId: ids.mclaren, role: "secondary" }],
      evidence: [{ id: "81000000-0000-4000-8000-000000000003", type: "pitStop", lap: 38, driverId: ids.verstappen, tyreCompound: "hard", sourceIds: [ids.sourceF1British] }, { id: "81000000-0000-4000-8000-000000000004", type: "position", lap: 48, driverId: ids.verstappen, position: 2, sourceIds: [ids.sourceF1British] }],
      concepts: [{ id: ids.tyreChoiceConcept, slug: "tyre-offset", name: "Tyre offset", category: "tyres" }],
      explanation: { whatHappened: "Verstappen recovered to Norris and passed him for second late in the race.", whyItHappened: "Red Bull selected the durable hard tyre, which retained performance as Norris's soft tyres faded.", whyItMatters: "The different compound choice turned a late deficit into second place.", watchNext: "Compare compound age and lap times before deciding whether the chasing car's faster pace will last.", conceptIds: [ids.tyreChoiceConcept], sourceIds: [ids.sourceF1British, ids.sourceFiaBritish] },
      connections: [], media: [{ id: "82000000-0000-4000-8000-000000000002", provider: "officialF1", kind: "video", title: "Verstappen powers past Norris for P2", url: "https://www.formula1.com/en/video/2024-british-grand-prix-verstappen-powers-past-norris-for-p2.1803935535997055584", attribution: "Formula 1", sourceIds: [ids.sourceF1VerstappenVideo] }], sourceIds: [ids.sourceF1British, ids.sourceFiaBritish],
    },
    {
      id: ids.dutchMoment, raceId: ids.dutchRace, sessionId: ids.dutchSession, slug: "perez-pits-as-rain-arrives", type: "strategyChange", status: "curated", title: "Pérez reacts immediately to rain", summary: "Pérez stopped for intermediate tyres at the end of lap 1 while several rivals stayed on slicks.", lapNumber: 1, sequence: 1, importance: 4,
      drivers: [{ entityId: ids.perez, role: "primary" }, { entityId: ids.norris, role: "affected" }], teams: [{ entityId: ids.redBull, role: "primary" }, { entityId: ids.mclaren, role: "affected" }],
      evidence: [{ id: "81000000-0000-4000-8000-000000000005", type: "pitStop", lap: 1, driverId: ids.perez, tyreCompound: "intermediate", sourceIds: [ids.sourceF1Dutch] }],
      concepts: [{ id: ids.pitWindowConcept, slug: "pit-window", name: "Pit window", category: "strategy" }],
      explanation: { whatHappened: "Pérez switched to intermediates immediately as rain arrived; drivers who waited another lap lost substantial time.", whyItHappened: "Intermediate tyres offered grip once the surface became too wet for slicks.", whyItMatters: "The early call vaulted Pérez into the lead and demonstrated the cost of delayed reaction in crossover conditions.", watchNext: "In sudden rain, compare the time lost in the pit lane with the lap-time loss of staying on slicks.", conceptIds: [ids.pitWindowConcept], sourceIds: [ids.sourceF1Dutch] },
      connections: [{ targetMomentId: ids.hamiltonMoment, reason: "similarStrategy", explanation: "The British and Dutch moments both turn on judging the crossover lap before a rival does.", sourceIds: [ids.sourceF1Dutch, ids.sourceF1British] }],
      media: [{ id: "82000000-0000-4000-8000-000000000003", provider: "officialF1", kind: "video", title: "Rain causes early Dutch Grand Prix drama", url: "https://www.formula1.com/en/latest/article/race-start-watch-the-exciting-start-from-the-dutch-grand-prix-as-rain-causes.5Vz4wfEMT9xrrkxjkZJiH", attribution: "Formula 1", sourceIds: [ids.sourceF1DutchVideo] }], sourceIds: [ids.sourceF1Dutch],
    },
  ],
  externalReferences: [
    { id: "a0000000-0000-4000-8000-000000000001", provider: "f1", resourceType: "race", externalId: "2024-british-grand-prix", sourceId: ids.sourceF1British, sourceUrl: "https://www.formula1.com/en/racing/2024/great-britain", fetchedAt: retrievedAt, entityId: ids.britishRace },
    { id: "a0000000-0000-4000-8000-000000000002", provider: "f1", resourceType: "race", externalId: "2023-dutch-grand-prix", sourceId: ids.sourceF1Dutch, fetchedAt: retrievedAt, entityId: ids.dutchRace },
    { id: "a0000000-0000-4000-8000-000000000003", provider: "f1", resourceType: "raceMoment", externalId: "1803934075419823982", sourceId: ids.sourceF1HamiltonVideo, sourceUrl: "https://www.formula1.com/en/video/2024-british-grand-prix-hamilton-re-takes-the-lead-after-pitting-ahead-of-norris.1803934075419823982", fetchedAt: retrievedAt, entityId: ids.hamiltonMoment },
    { id: "a0000000-0000-4000-8000-000000000004", provider: "f1", resourceType: "raceMoment", externalId: "1803935535997055584", sourceId: ids.sourceF1VerstappenVideo, fetchedAt: retrievedAt, entityId: ids.verstappenMoment },
  ],
});

export { ids as canonicalFixtureIds };
