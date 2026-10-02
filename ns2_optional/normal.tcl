# ======================================================================
# NS-2 Simulation: Normal Emergency Network Communication
# Topology: 7 Nodes (N0 to N6), Redundant Links, CBR over UDP
# ======================================================================

set ns [new Simulator]

# Open Trace and NAM trace files
set tracefile [open normal_trace.tr w]
$ns trace-all $tracefile
set namfile [open normal.nam w]
$ns namtrace-all $namfile

# Define Finish procedure
proc finish {} {
    global ns tracefile namfile
    $ns flush-trace
    close $tracefile
    close $namfile
    puts "Normal Scenario NS-2 simulation finished."
    exit 0
}

# Create Nodes
set n0 [$ns node] ;# Emergency Control Center
set n1 [$ns node] ;# Police Station
set n2 [$ns node] ;# Fire Services
set n3 [$ns node] ;# Ambulance Unit
set n4 [$ns node] ;# Field Response Team
set n5 [$ns node] ;# Emergency Shelter
set n6 [$ns node] ;# Backup Control Center

# Create Links (Bandwidth, Propagation Delay, Queue DropTail)
$ns duplex-link $n0 $n1 100Mb 10ms DropTail
$ns duplex-link $n0 $n2 100Mb 15ms DropTail
$ns duplex-link $n1 $n3 50Mb  12ms DropTail
$ns duplex-link $n2 $n3 50Mb  5ms  DropTail
$ns duplex-link $n3 $n5 100Mb 8ms  DropTail
$ns duplex-link $n1 $n4 20Mb  25ms DropTail
$ns duplex-link $n4 $n5 20Mb  20ms DropTail
$ns duplex-link $n2 $n6 100Mb 10ms DropTail
$ns duplex-link $n6 $n5 100Mb 15ms DropTail
$ns duplex-link $n0 $n6 50Mb  30ms DropTail

# Set Routing Protocol
$ns rtproto DV

# Setup UDP agent and CBR traffic from n0 to n5
set udp [new Agent/UDP]
$ns attach-agent $n0 $udp
set null [new Agent/Null]
$ns attach-agent $n5 $null
$ns connect $udp $null

set cbr [new Application/Traffic/CBR]
$cbr set packetSize_ 1000
$cbr set rate_ 1Mb
$cbr set random_ false
$cbr attach-agent $udp

# Schedule Events
$ns at 0.5 "$cbr start"
$ns at 4.5 "$cbr stop"
$ns at 5.0 "finish"

$ns run
