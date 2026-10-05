#  NOVA STRIKE

### Defend the galaxy. Destroy the darkness.

**NOVA STRIKE** is a fast-paced browser-based space shooter built with **HTML5 Canvas, CSS, and Vanilla JavaScript**.

Take control of an advanced combat spacecraft, destroy increasingly dangerous enemy ships, collect powerful upgrades, survive escalating waves, and defeat powerful bosses.

---

##  Game Overview

NOVA STRIKE is designed around arcade-style space combat with progressively increasing difficulty.

You start with a powerful spacecraft and fight through enemy waves while:

* Destroying enemy spacecraft
* Building your combo multiplier
* Collecting falling power-ups
* Upgrading your weapons
* Using missiles and Nova Bombs
* Surviving special enemy attacks
* Fighting increasingly dangerous bosses
* Trying to beat your high score

There is no fixed final wave. The objective is to **survive as long as possible and achieve the highest score you can**.

---

##  How to Play

### Controls

| Key       | Action           |
| --------- | ---------------- |
| `W` / `↑` | Move Up          |
| `A` / `←` | Move Left        |
| `S` / `↓` | Move Down        |
| `D` / `→` | Move Right       |
| `SPACE`   | Fire weapons     |
| `Z`       | Fire weapons     |
| `X`       | Deploy Nova Bomb |
| `P`       | Pause / Resume   |

### Basic Strategy

1. Move continuously to avoid enemy fire.
2. Hold **SPACE** or **Z** to continuously fire.
3. Destroy enemies before they reach dangerous positions.
4. Watch for glowing power-ups and collect them.
5. Maintain your combo to increase your score multiplier.
6. Save Nova Bombs for dangerous situations or bosses.
7. Prepare for boss battles every second wave.
8. Keep improving your weapons as the waves become harder.

---

#  Combat System

##  Primary Weapons

Your spacecraft automatically fires while `SPACE` or `Z` is held.

Your weapon can be upgraded through power-ups:

* Increased bullet speed
* Increased bullet damage
* Multiple bullet columns
* Faster fire rate
* Homing projectiles
* Player missiles

### Multi-Bullet System

You can increase your bullet pattern from:

`1 → 2 → 3 → 4 columns`

The wider bullet pattern makes it easier to eliminate groups of enemies.

---

##  Missile System

Missile upgrades increase the number of missiles launched by your spacecraft.

Missiles can track enemy targets for a limited period, making them especially useful against moving enemies and bosses.

Missile rewards become available from **Wave 3 onward**.

---

#  Nova Bomb

The **Nova Bomb** is your emergency super-weapon.

Press:

```text
X
```

to activate it.

A Nova Bomb:

* Destroys active regular enemies
* Clears enemy projectiles
* Destroys deployed mines
* Deals heavy damage to the boss
* Creates a large visual explosion and screen-shake effect

You begin a run with limited bomb charges and can collect **Nova Charge** power-ups to replenish them.

Maximum bomb capacity: **3**

---

#  Power-Ups

Power-ups appear as collectible drops during combat.

They become available progressively as you advance through the waves.

| Power-Up               | Effect                                               |
| ---------------------- | ---------------------------------------------------- |
|  **Shield**         | Absorbs hits for 8 seconds                           |
|  **Rapid Fire**      | Greatly increases firing speed for 5 seconds         |
|  **Health +30**      | Restores 30 health                                   |
|  **Nova Charge**     | Adds one bomb charge                                 |
|  **Bullet Speed**     | Permanently increases bullet speed during the run    |
|  **Missile Upgrade** | Adds player missiles, up to 2 per launch             |
|  **2 Bullets**       | Upgrades weapon to 2 bullet columns                  |
|  **3 Bullets**       | Upgrades weapon to 3 bullet columns                  |
|  **4 Bullets**       | Upgrades weapon to 4 bullet columns                  |
|  **Damage +1**       | Increases bullet damage                              |
|  **Homing**          | Makes bullets track enemies for 8 seconds            |
|  **Magnet**          | Pulls nearby rewards toward the player for 8 seconds |
|  **Health Boost**    | Increases maximum health and fully restores health   |

### Power-Up Availability

Weapon expansion rewards such as missile and multi-bullet upgrades begin appearing from **Wave 3**.

Rewards are not dropped randomly on every kill. They are controlled by a kill-based system that becomes less frequent in later waves to prevent the screen from becoming overloaded with rewards.

Bosses also drop **two rewards when defeated**.

---

#  Enemy Fleet

NOVA STRIKE features multiple enemy spacecraft with different movement patterns, attack techniques, and physical designs.

## Enemy Types

| Enemy                   | Role / Behavior                                            |
| ----------------------- | ---------------------------------------------------------- |
| **Basic Fighter**       | Standard enemy spacecraft                                  |
| **Fast Fighter**        | High-speed attack ship                                     |
| **Tank**                | Heavy armored enemy with high health                       |
| **Shooter**             | Dedicated ranged attacker                                  |
| **Splitter**            | Splits into smaller enemy ships when destroyed             |
| **Zigzag Fighter**      | Moves unpredictably from side to side                      |
| **Shielded Ship**       | Uses a rotating defensive shield                           |
| **Orbiter**             | Moves around an orbital path                               |
| **Bomber**              | Performs dangerous diving attacks                          |
| **Interceptor**         | Very fast ship that aggressively tracks the player         |
| **Flanker**             | Enters from the sides and performs dash attacks            |
| **Sniper**              | Long-range attacker with a powerful aimed shot             |
| **EMP Ship**            | Releases an electromagnetic pulse that disrupts the player |
| **Mine Layer**          | Deploys explosive mines                                    |
| **Shield Support Ship** | Provides defensive support to nearby enemies               |
| **Drone Swarmer**       | Appears in small groups and attacks as a swarm             |
| **Elite**               | Advanced high-health enemy with stronger attacks           |

Different enemy classes are progressively introduced as the waves increase.

---

#  Enemy Progression

The enemy fleet expands as you survive more waves.

| Wave   | New Threats                             |
| ------ | --------------------------------------- |
| **1**  | Basic, Fast, Tank, Shooter              |
| **2**  | Stronger enemy attacks + first boss     |
| **3**  | Interceptor, Flanker, Drone Swarms      |
| **4**  | Splitter                                |
| **5**  | Zigzag, Sniper, Mine Layer              |
| **6**  | Shielded enemies                        |
| **7**  | Orbiter, EMP Ship, Shield Support       |
| **8**  | Bomber                                  |
| **9+** | Elite enemies and advanced combinations |

Earlier enemy types continue appearing alongside newer threats.

---

#  Enemy Attack Techniques

Enemies use different attack patterns rather than relying on a single projectile.

Depending on the enemy, you may encounter:

* Direct aimed shots
* Spread shots
* Burst fire
* Tracking missiles
* High-speed interception
* Side-flanking attacks
* Diving attacks
* Sniper shots
* EMP pulses
* Mine deployment
* Shield-support effects
* Combined enemy formations

Many dangerous attacks include visual warning effects before they are executed, giving you a brief opportunity to react.

---

#  Boss Battles

A major boss appears **every second wave, beginning with Wave 2**.

Boss battles introduce stronger attacks, larger health pools, and multiple combat phases.

## Bosses

The boss roster escalates through several identities:

* **SENTINEL DRONE**
* **REAPER CARRIER**
* **VOID SENTINEL**
* **NOVA TYRANT**
* **CHAOS JUGGERNAUT**

Higher waves can also produce upgraded **MK** variants.

---

##  Boss Attack System

Boss attacks become more dangerous as the boss loses health.

Boss attacks can include:

* Aimed shots
* Spread fire
* Missiles
* Spiral projectile patterns
* Plasma barrages
* Laser attacks
* Charge attacks
* Nova shockwaves
* EMP storms
* Enemy summons
* Cluster bombs
* Minefields

Later waves combine multiple attack patterns to create much more demanding encounters.

---

#  Combo & Scoring System

Destroying enemies consecutively builds your combo.

The combo multiplier increases as your kill streak grows and can reach a maximum of:

```text
×8
```

A higher multiplier means significantly more points from destroyed enemies and bosses.

### Score comes from:

* Destroying enemies
* Destroying bosses
* Maintaining combos
* Using effective combat strategies

Bosses provide a large score bonus based on the current wave.

---

#  Statistics

When the mission ends, NOVA STRIKE records and displays:

* **Final Score**
* **Waves Survived**
* **Enemies Destroyed**
* **Accuracy**
* **Best Combo**
* **Time Survived**
* **Bosses Defeated**

Your personal high score is saved locally in your browser.

---

#  Visual Design

NOVA STRIKE uses a neon sci-fi visual style combined with a deep-space environment.

The game includes:

* Animated starfield
* Multiple star layers
* Shooting stars
* Space particles
* Weapon muzzle flashes
* Explosion effects
* Shockwaves
* Enemy attack telegraphs
* Boss health bars
* Screen shake
* Ship banking and movement effects
* Glowing energy effects
* Distinct spacecraft silhouettes

Enemy classes use different hull geometries, wings, engines, weapon structures, sensors, armor and proportions to make them visually distinguishable.

---

#  Technology Stack

NOVA STRIKE is intentionally lightweight and runs directly in a web browser.

### Frontend

* **HTML5**
* **CSS3**
* **JavaScript**
* **HTML5 Canvas API**

### Other

* Browser `localStorage` for high-score persistence
* Google Fonts for the futuristic typography

No framework or build system is required.

---

#  Project Structure

```text
NovaStrike/
│
├── index.html      # Game interface and screens
├── style.css       # Visual styling and animations
├── game.js         # Game engine, gameplay and rendering
└── README.md       # Project documentation
```

---

#  Running the Game Locally

### Option 1 — Open directly

Download or clone the repository and open:

```text
index.html
```

in a modern desktop web browser.

### Option 2 — Use VS Code / another editor

Open the project folder and launch `index.html` using a local development server such as **Live Server**.

---

#  GitHub

Repository:

**https://github.com/tejass23106/NovaStrike**

The project can also be hosted as a static website using services such as **GitHub Pages**.

---

#  Objective

Your mission is simple:

> **Survive. Upgrade. Destroy. Dominate the galaxy.**

How far can you reach?

**Can you defeat the CHAOS JUGGERNAUT?**

---

##  NOVA STRIKE

**Defend the galaxy. Destroy the darkness.**
