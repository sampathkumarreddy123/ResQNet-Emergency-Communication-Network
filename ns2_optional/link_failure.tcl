# ======================================================================
# NS-2 Simulation: Dynamic Link Failure and Dynamic Route Recalculation
# Shuts down primary link (N1-N3) at t=2.0s, restores at t=4.0s
# ======================================================================

set ns [new Simulator]

set tracefile [open link_failure_trace.tr w]
$ns trace-all $tracefile
set namfile [open link_failure.nam w]
$ns namtrace-all $namfile

proc finish {} {
    global ns tracefile namfile
    $ns flush-trace
    close $tracefile
    close $namfile
    puts "Link Failure Scenario NS-2 simulation finished."
    exit 0
}

set n0 [$ns node]
set n1 [$ns node]
set n2 [$ns node]
set n3 [$ns node]
set n4 [$ns node]
set n5 [$ns node]
set n6 [$ns node]

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

# Dynamic routing protocol (Distance Vector)
$ns rtproto DV

set udp [new Agent/UDP]
$ns attach-agent $n0 $udp
set null [new Agent/Null]
$ns attach-agent $n5 $null
$ns connect $udp $null

set cbr [new Application/Traffic/CBR]
$cbr set packetSize_ 1000
$cbr set rate_ 2Mb
$cbr attach-agent $udp

# Traffic starts at 0.5s
$ns at 0.5 "$cbr start"

# Link failure scheduled at t=2.0s
$ns rtmodel-at 2.0 down $n1 $n3

# Link recovery scheduled at t=4.0s
$ns rtmodel-at 4.0 up $n1 $n3

$ns at 5.5 "$cbr stop"
$ns at 6.0 "finish"

$ns run
