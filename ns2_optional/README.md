# Optional NS-2 Simulation Scripts

This directory contains standalone Network Simulator 2 (NS-2) TCL scripts matching the 7-node emergency communication topology.

> **Note**: NS-2 is an optional legacy simulation reference. The primary production simulator for this project is implemented in Python in the `backend/` directory. Results in the web dashboard are produced directly by the Python simulation engine and are not claimed to be produced by NS-2.

## Provided Scenarios

1. `normal.tcl`: Baseline 7-node emergency network with Distance Vector routing and UDP/CBR traffic from N0 (Emergency Control Center) to N5 (Emergency Shelter).
2. `congestion.tcl`: Congestion scenario with bottleneck bandwidth on N3-N5 (5 Mbps, queue limit 10), generating queue buildup and DropTail packet drops.
3. `link_failure.tcl`: Dynamic link failure of link N1-N3 at $t=2.0\text{s}$ and recovery at $t=4.0\text{s}$ using dynamic DV routing.

## How to Run (if NS-2 is installed on Linux/WSL)

```bash
# Run normal scenario
ns normal.tcl

# Run congestion scenario
ns congestion.tcl

# Run dynamic link failure scenario
ns link_failure.tcl

# View Network Animator (NAM) visualization
nam normal.nam
```
