# Research: Old World Game Features (Not in Civilization)

**Date**: 2026-01-17
**Status**: Complete

## Summary
Old World (Mohawk Games, 2020) is a 4X strategy game designed by Soren Johnson (lead designer of Civilization IV). While building on Civilization's foundations, it introduces several revolutionary mechanics that dramatically change the 4X experience. The most significant innovations are the Orders system (replacing per-unit movement), the character/dynasty system (leaders age and die), and narrative events that create emergent storytelling. These systems work together to create a more dynamic, human-scale strategy experience.

## Key Discoveries
- **Orders System** fundamentally changes turn economy from "move each unit" to "spend limited actions wisely"
- **Character System** replaces immortal player agency with mortal rulers who have personalities, relationships, and families
- **Event System** creates narrative depth through choice-driven scenarios with lasting consequences
- **Ambitions** provide personal victory conditions tied to your current ruler's goals
- **Training/Resources** separates unit recruitment into Training (ability to build) and Resources (cost to maintain)
- **Urban Specialists** replace binary worked/unworked tiles with stackable specialist slots
- **Tech Tree** uses cards drawn from a pool rather than linear progression
- **10 turns = 1 year** time scale anchors the game in believable historical progression

---

## Feature Analysis

---

### 1. Orders System

#### What It Is
Instead of each unit having its own movement points that must be spent, Old World uses a global pool of "Orders" that are spent to perform any action: moving units, attacking, building improvements, even forcing production. All actions draw from this single shared resource.

Orders per turn are calculated based on:
- Base Orders (starts around 2-3)
- Number of cities (+1 per city, with diminishing returns)
- Legitimacy level (higher legitimacy = more orders)
- Leader traits (some grant bonus orders)
- Specialists (certain urban specialists add orders)

#### How It Differs from Civilization
| Aspect | Civilization | Old World |
|--------|--------------|-----------|
| Action economy | Per-unit movement points | Global orders pool |
| Unit without actions | Wastes that unit's potential | Saves orders for important units |
| Late game | "Unit spam" - click through dozens | Focus on key actions only |
| Decisioning | Move everyone you can | Agonizing prioritization |
| Exploration | Free (just move scouts) | Costs precious orders |
| Fortified units | Use no attention | Can still be moved if needed |

#### Why It Enhances Gameplay
1. **Eliminates Late-Game Tedium**: In Civ, having 30 units means 30 decisions per turn. In Old World, you might have 15 orders to spend across all those units. You focus on what matters.

2. **Creates Meaningful Trade-offs**: Should you explore that ruin or push your front-line attack? Move your builder or recruit? Every action competes.

3. **Rewards Efficiency**: A smaller, elite force using fewer orders can outperform a larger army that drains your orders budget.

4. **Scales Gracefully**: As your empire grows, orders grow slowly, forcing prioritization rather than micromanagement.

5. **Emergent Strategy**: You might leave units unmoved for multiple turns, banking their "future moves" as free positioning.

#### Implementation Recommendation: **HIGH PRIORITY**
This is Old World's most innovative and portable feature. It directly solves Civilization's biggest pain point (late-game tedium) while creating interesting strategic depth. Can be implemented relatively independently of other systems.

**Implementation Notes**:
- Calculate base orders from leader stats + city count + legitimacy
- Each unit action (move, attack, fortify, etc.) costs 1+ orders
- Workers/Builders cost orders for each improvement action
- Consider "free actions" for some things (selecting, looking at cities)
- Units can still have movement points within a single order expenditure

---

### 2. Character/Dynasty System

#### What It Is
Unlike Civilization where you play as an immortal leader, Old World puts you in control of a dynasty. Your ruler:
- Has a birth year and will eventually die (of old age, battle, assassination, or disease)
- Has personality traits (Bold, Cruel, Educated, Weak, etc.)
- Has relationships with family members, courtiers, and foreign rulers
- Marries and produces heirs
- Can be succeeded by children, siblings, or designated heirs

The game tracks 4-5 stats per character:
- **Charisma**: Diplomacy, influence generation
- **Courage**: Combat bonuses, military actions
- **Discipline**: Orders generation, administrative efficiency
- **Wisdom**: Research, cultural actions

#### Family/Court Structure
- **Royal Family**: Your dynasty, potential heirs
- **Noble Families**: 4 powerful families (e.g., Landowners, Traders, Clerics, Champions)
- **Courtiers**: Generals, governors, ambassadors, spymasters
- **Relationships**: Love, friendship, rivalry, hatred between any characters

#### How It Differs from Civilization
| Aspect | Civilization | Old World |
|--------|--------------|-----------|
| Leader | Immortal symbol | Mortal with lifespan |
| Succession | N/A | Crisis event, potential civil war |
| Character traits | Civilization-level bonuses | Personal bonuses, change over time |
| Relationships | With other civs only | Rich internal politics |
| Marriage | N/A | Diplomatic/strategic tool |
| Death | N/A | Major game event |

#### Why It Enhances Gameplay

1. **Emergent Narrative**: Every game creates a unique family saga. Your brilliant queen dies, leaving her incompetent son. His brother schemes for the throne. This writes itself.

2. **Temporal Depth**: Games feel like they span generations, not abstract turns. Your first ruler founds the capital; their grandchild conquers the continent.

3. **Interesting Decisions**: Should you send your heir to battle (experience) or keep them safe? Marry for alliance or for traits?

4. **Humanizes Strategy**: You're not an omniscient player; you're a family fighting to maintain power. Failures feel personal.

5. **Legitimacy Dynamics**: New rulers must prove themselves, creating natural empire instability periods.

#### Implementation Recommendation: **HIGH PRIORITY (Core System)**
This system is central to Old World's identity and creates the most narrative differentiation. However, it's complex and touches many systems.

**Implementation Notes**:
- Characters need: name, birth year, traits, stats, relationships, family links
- Death/succession must be dramatic game events
- Traits should meaningfully affect gameplay (not just flavor)
- Consider simplified version: just rulers + heirs initially
- Noble families add depth but can come later

---

### 3. Event System

#### What It Is
Old World features a robust event system that presents narrative choices throughout the game. Events are tied to:
- Character relationships (your heir is caught stealing)
- Game situations (a city is starving, troops are restless)
- Random chance (a merchant offers a deal)
- Historical flavor (building a wonder triggers celebration)

Events typically offer 2-4 choices, each with different consequences:
- Resource gains/losses
- Character trait changes
- Relationship changes
- Unit/improvement spawns
- Opinion modifiers

#### Event Categories
1. **Personal Events**: About your ruler, family, courtiers
2. **Political Events**: Noble family demands, succession crises
3. **Military Events**: Troop morale, battle outcomes, mercenary offers
4. **City Events**: Population issues, building dedications
5. **Diplomatic Events**: Foreign marriages, treaties, insults
6. **Random Events**: Omens, discoveries, travelers

#### How It Differs from Civilization
| Aspect | Civilization | Old World |
|--------|--------------|-----------|
| Events | Rare, mostly notifications | Frequent, choice-driven |
| Story | Emergent from map alone | Narrative overlay on strategy |
| Character depth | Leaders are static icons | Rich internal drama |
| Consequences | Usually clear, immediate | Often delayed, surprising |
| Player agency | Full control always | Sometimes forced choices |

#### Example Events
- "Your heir demands command of the army. Refusing may damage their confidence, but they are inexperienced."
- "The Sage family demands a seat on your council. Compliance gains their favor but angers the Warriors."
- "Your spouse has taken a lover. Confront them? Ignore it? Use the knowledge?"
- "A prophet claims your city is cursed. Execute them (lose piety), exile them (unrest), or hear them out?"

#### Why It Enhances Gameplay

1. **Creates Stories**: Players remember "the time my queen poisoned her husband" more than "the time I built Petra."

2. **Meaningful Choices**: No obviously correct answer. Trade resources for relationships? Safety for glory?

3. **Character Investment**: You care about characters because events give them personality and agency.

4. **Replayability**: Random events ensure different games feel different, even with same civilization.

5. **Integrates Systems**: Events connect military, economic, political, and personal spheres.

#### Implementation Recommendation: **MEDIUM-HIGH PRIORITY**
Events are high-impact for player experience but require significant content creation. Start with a small, quality event pool that demonstrates the system.

**Implementation Notes**:
- Events need: trigger conditions, choice options, consequences per choice
- Data-driven (YAML/JSON) for easy content creation
- Weight events by game phase (early game vs. late game appropriate)
- Link events to character system (events reference specific people)
- Consider event chains (choice leads to follow-up event later)

---

### 4. Legitimacy and Ambitions

#### What It Is

**Legitimacy** represents how secure your ruler's claim to power is. It affects:
- Orders per turn (high legitimacy = more orders)
- Family/noble happiness
- Resistance to usurpers
- Some event options

Legitimacy is gained by:
- Completing Ambitions
- Military victories
- Wonder completion
- Positive events
- Strong relationships

**Ambitions** are personal goals for each ruler, drawn from a pool:
- "Control 10 cities"
- "Have 5 Champion family members"
- "Win a war against Persia"
- "Build the Royal Library"

Completing 10 ambitions is a victory condition. But each ruler gets 2-3 ambitions at a time, and they're tied to that ruler - if they die, those ambitions may be lost.

#### How It Differs from Civilization
| Aspect | Civilization | Old World |
|--------|--------------|-----------|
| Victory | Fixed conditions (Science, Domination, etc.) | Personal ambitions, 10 total |
| Goals | Same for all players | Unique per ruler |
| Timing | Whenever achieved | Tied to ruler lifespan |
| Flexibility | Must commit to victory type | Mix and match ambitions |
| Narrative | Detached from story | Goals create narrative drive |

#### Why It Enhances Gameplay

1. **Personal Stakes**: You're not racing toward abstract victory; you're fulfilling your ruler's dreams.

2. **Dynamic Goals**: Different rulers want different things. Your warrior-king's ambitions differ from your scholar-queen's.

3. **Temporal Pressure**: Older rulers create urgency - complete ambitions before death!

4. **Varied Playstyles**: One game you chase military ambitions; next game, economic ones.

5. **Legitimacy Tension**: Low legitimacy creates cascading problems (fewer orders, family unrest, events).

#### Implementation Recommendation: **MEDIUM PRIORITY**
Legitimacy creates good feedback loops. Ambitions require the character system first. Can be simplified initially.

**Implementation Notes**:
- Legitimacy: 0-200 scale, affects orders calculation
- Ambitions: pool of ~50 possible goals, draw 2-3 per ruler
- Track progress toward each ambition
- On ruler death, offer choice to keep some ambitions (at cost)
- Completing ambition = legitimacy boost + victory point

---

### 5. Urban Specialists System

#### What It Is
Instead of Civ's system where each population works one tile, Old World uses specialists:

- **Rural population**: Works tiles in the city radius (like Civ)
- **Urban specialists**: Population assigned to specialist slots in the city center

Urban specialist types:
- **Laborers**: +Production (mining, crafting)
- **Disciples**: +Culture, +Religious (temples)
- **Traders**: +Gold, +Science (markets)
- **Sages**: +Science, +Culture (libraries)
- **Officers**: +Orders, +Training (barracks)
- **Slaves**: +Production, +Food (from conquest)

Buildings unlock specialist slots. A Barracks adds 2 Officer slots. A Library adds 2 Sage slots.

#### How It Differs from Civilization
| Aspect | Civilization | Old World |
|--------|--------------|-----------|
| Population | Each works 1 tile | Split between rural and urban |
| Specialization | Specialist buildings limited | Many specialist slots available |
| Buildings | Direct bonuses | Unlock specialist capacity |
| Growth | More people = more tiles worked | Strategic urban/rural balance |
| Flexibility | Reassign tile workers | Reassign between rural/urban |

#### Why It Enhances Gameplay

1. **Meaningful City Specialization**: Capital with many Officer slots differs fundamentally from a trading city with Trader slots.

2. **Strategic Depth**: Balance between rural (food/production) and urban (gold/science/culture) creates interesting decisions.

3. **Building Significance**: Buildings matter more because they unlock capacity, not just provide bonuses.

4. **Population Trade-offs**: Growing population is always good in Civ; in Old World, you might want fewer people in a low-slot city.

#### Implementation Recommendation: **MEDIUM PRIORITY**
Adds strategic depth but requires reworking city/building systems. Can be added to existing city system.

**Implementation Notes**:
- Track urban vs. rural population separately
- Buildings provide specialist slots by type
- Each urban specialist provides yields based on type
- Rural population still works tiles (existing system)
- Consider food consumption differences (urban vs. rural)

---

### 6. Training and Resources

#### What It Is
Military units require two separate resources:

**Training**: Represents your nation's military readiness/capacity
- Generated by certain buildings (Ranges, Strongholds)
- Spent to unlock the ability to build unit types
- Higher tier units require more training investment
- Shared across all cities

**Resources**: Traditional costs (Iron, Horses, Wood, Stone, Food)
- Required to actually build and maintain units
- Strategic resources (Iron, Horses) for specific unit types
- Basic resources for all units

Additionally, units have maintenance costs in resources per turn.

#### How It Differs from Civilization
| Aspect | Civilization | Old World |
|--------|--------------|-----------|
| Unit unlock | Research technology | Training points + tech |
| Building cost | Production only | Resources + production |
| Strategic resources | Enable unit, count-limited | Enable and maintain unit |
| Military capacity | Limited by production/gold | Training = soft cap |
| Maintenance | Gold per unit | Resources per unit |

#### Why It Enhances Gameplay

1. **Investment in Military**: Can't just build barracks and spam units; must invest in training infrastructure.

2. **Preparation Matters**: Building training before war lets you rapidly produce when conflict starts.

3. **Resource Strategy**: Must control/trade for resources to maintain army, not just build it.

4. **Natural Army Limits**: Training creates soft cap on military without arbitrary unit limits.

5. **Economic Warfare**: Cutting off enemy resources degrades their military over time.

#### Implementation Recommendation: **LOW-MEDIUM PRIORITY**
Adds realism and strategic depth but adds complexity to already complex military system.

**Implementation Notes**:
- Training as global resource, generated by military buildings
- Tech unlocks unit types, Training unlocks ability to build them
- Units require resources to build AND maintain
- Running out of maintenance resources = unit penalties or disbanding

---

### 7. Non-Linear Tech System

#### What It Is
Instead of a fixed tech tree, Old World uses a card-based system:

- Each turn, you're offered 4 tech "cards" drawn from available technologies
- Pick one to research
- Cards not picked may reappear later, or may not
- Some techs have prerequisites (can't draw Masonry before Mining)
- But within available techs, draws are semi-random

The system groups techs into tiers/ages, with higher tiers requiring certain number of lower-tier techs completed.

#### How It Differs from Civilization
| Aspect | Civilization | Old World |
|--------|--------------|-----------|
| Research choice | Pick from full tree | Choose from 4 random draws |
| Planning | Can plan entire game | Must adapt to offerings |
| Beelining | Go straight to key tech | May not be offered it |
| Pacing | Predictable tech timing | Variable based on draws |
| Replayability | Same optimal path | Different each game |

#### Why It Enhances Gameplay

1. **Adaptability**: Can't always execute pre-planned strategy; must adapt to what's offered.

2. **Replayability**: No optimal tech path means different games play differently.

3. **Reduces Analysis Paralysis**: Four choices instead of 30 possible techs.

4. **Creates Narrative**: "We had to develop Siege Weapons because no one discovered Philosophy."

5. **Balances Play Styles**: Can't always rush key techs; levels playing field.

#### Implementation Recommendation: **LOW-MEDIUM PRIORITY**
Interesting variation but traditional tech tree works fine. Consider as optional game mode.

**Implementation Notes**:
- Tech pool with prerequisites
- Draw 4 eligible techs per turn (no valid prereqs missing)
- Track available pool vs. researched
- Ensure critical techs have high draw weight
- Consider "focus" mechanic to weight draws toward categories

---

### 8. Other Unique Mechanics

#### Time Scale (10 Turns = 1 Year)
- Games span 200 years max (2000 turns)
- Anchors events in believable timeframes
- Characters age realistically (ruler at 20, dies at 65)
- Creates urgency without arbitrary turn limits

**Recommendation**: MEDIUM - Helps character system feel grounded

#### Limited Scope (7 Civilizations, Bronze-Iron Age)
- Only ancient Mediterranean/Near East civs
- Narrow time period allows deeper detail
- No modern era, no "from cavemen to spaceships"

**Recommendation**: Design choice, not feature. Narrower scope allows depth.

#### Wonders as National Projects
- Wonders require multiple cities contributing
- Take many turns to complete
- Historical detail about construction

**Recommendation**: LOW - Interesting but complex to implement

#### Laws/State Religion
- Rulers can enact laws that provide bonuses/penalties
- State religion chosen, affects events and bonuses
- Laws can be changed but causes unrest

**Recommendation**: MEDIUM - Adds governance depth

#### Cognomen System
- Rulers earn titles based on achievements
- "The Great," "The Wise," "The Cruel"
- Affects legitimacy and events

**Recommendation**: LOW - Flavor feature, easy to add late

---

## Summary Comparison Table

| Feature | Gameplay Impact | Implementation Difficulty | Priority |
|---------|-----------------|--------------------------|----------|
| Orders System | Very High | Medium | **HIGH** |
| Character/Dynasty | Very High | High | **HIGH** |
| Event System | High | Medium-High | **MEDIUM-HIGH** |
| Legitimacy/Ambitions | Medium-High | Medium | **MEDIUM** |
| Urban Specialists | Medium | Medium | **MEDIUM** |
| Training/Resources | Medium | Medium | **LOW-MEDIUM** |
| Non-Linear Tech | Low-Medium | Low | **LOW-MEDIUM** |
| Time Scale | Medium | Low | **MEDIUM** |

---

## Recommendations for OpenCiv Implementation

### Phase 1: Core Innovations (Highest Impact)
1. **Orders System** - Implement first, transforms gameplay immediately
   - Can be added to existing unit system
   - Dramatic quality-of-life improvement
   - Independent of other Old World systems

### Phase 2: Character Foundation
2. **Basic Character System** - Leaders with traits, lifespan, succession
   - Start simple: just ruler and heir
   - Add family/courtiers later
   - Foundation for events

3. **Basic Event System** - Text events with choices
   - Start with 20-30 quality events
   - Tie to character traits and game state
   - Build content over time

### Phase 3: Governance Depth
4. **Legitimacy** - Affects orders and stability
   - Creates feedback loops
   - Enhances character stakes

5. **Ambitions** - Victory through personal goals
   - Alternative to standard victory conditions
   - Increases narrative engagement

### Phase 4: Economic Refinements
6. **Urban Specialists** - Deeper city specialization
7. **Training System** - Military preparation matters
8. **Tech Variation** - Optional alternative to tree

---

## Key Files for Reference

| Resource | Description |
|----------|-------------|
| Old World Wiki | Community documentation of mechanics |
| Mohawk Games Dev Diaries | Design rationale from Soren Johnson |
| Designer Notes Podcast | Soren's explanations of design choices |
| GDC Talks | Soren Johnson presentations on Old World design |

---

## Open Questions

1. **Multiplayer Balance**: Does the Orders system work well in competitive multiplayer? (Old World is primarily single-player)

2. **AI Complexity**: Can AI handle character/dynasty decision-making effectively?

3. **Event Content**: How much content is needed for events to feel fresh across multiple games?

4. **Learning Curve**: Do these systems add too much complexity for new players?

5. **Hybrid Approaches**: Could Orders be optional (classic mode vs. Old World mode)?

6. **Scope Creep**: Character system touches many areas - how to implement incrementally without breaking coherence?

---

## Conclusion

Old World's innovations address real pain points in the Civilization formula, particularly late-game tedium (Orders) and lack of narrative (Characters/Events). The **Orders System** is the most portable and immediately impactful feature - it can be implemented relatively independently and dramatically improves gameplay pacing.

The **Character/Dynasty System** is more transformative but requires more architectural investment. It's worth pursuing because it creates the emergent narratives that make Old World memorable.

For a Civ-like game, the recommended approach is:
1. Start with Orders (huge win, moderate effort)
2. Add basic Characters (ruler + heir + traits)
3. Layer in Events (content can grow over time)
4. Evolve complexity gradually

These systems work synergistically - events reference characters, characters affect orders, orders create decisions that generate events. The whole is greater than the parts.
