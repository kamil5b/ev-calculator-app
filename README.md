# EV Battery Calculator

An offline, installable web app that answers the everyday questions about your EV
battery: how much energy is actually in the pack, how much more you need, how far you
can still go, and what the next charge will cost.

**[Open the app](https://kamil5b.github.io/ev-calculator-app/)** — no account, no
tracking. Everything runs on your device.

## What it tells you

| Metric                          | Meaning                                                           |
| ------------------------------- | ----------------------------------------------------------------- |
| **Current battery**             | state of charge in kWh, next to the percentage                    |
| **To reach target**             | extra kWh needed to get to your target % (negative if it's lower) |
| **Usable energy**               | the capacity between your reserve and 100%                        |
| **Range to reserve / to empty** | remaining distance, in kilometres or miles                        |
| **Charge cost**                 | what topping up to your target costs, from your electricity price |
| **Trip estimate**               | battery left on arrival and the charge needed at the charger      |

Range reads "N/A" until you enter your car's efficiency — better no number than a
wrong one.

## Plan a road trip

The EV Road Planner turns a route into a battery forecast:

- name every point on the route (home, charger, work, …) and the distance from the
  previous one;
- mark the stops where you charge and how full you want to be when you leave
  ("Charge to");
- see the battery percentage you'll arrive with at every point, plus the trip totals —
  distance, energy used, charge needed and its cost;
- legs that are impossible, or that leave you below your reserve, are flagged on the
  spot.

Save a plan as a named trip and come back to it later — load, update or delete it with
one tap. Saved trips stay on your device.

## Your garage

Register every EV you drive: nickname, model, battery capacity and efficiency, with
common values offered as one-tap chips. Switching cars retunes every calculation
instantly, and cars can be edited or deleted at any time.

## Offline and private by design

- **Works offline** — after the first load the app never makes a network request.
  Airplane mode, basement, roaming: it still calculates.
- **Installable** — use the _Install app_ button (Chrome, Edge, Samsung Internet) or
  _Add to Home Screen_ (Safari) to run it like a native app.
- **Nothing leaves your device** — your inputs, cars and saved trips live in your
  browser's local storage. There is no account and no analytics.
- **Clear feedback** — inline validation messages, a low-battery warning, and a notice
  if your browser blocks local storage.

## Browser support

Chrome/Edge 90+, Firefox 88+, Safari 15+ (including iOS), Samsung Internet 14+.

## Contributing

Developing the app? The tech stack, architecture, commands, configuration and
deployment docs live in [CONTRIBUTOR_NOTES.md](./CONTRIBUTOR_NOTES.md).

## License

[MIT](./LICENSE)
