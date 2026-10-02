# ======================================================================
# NS-2 Simulation: Congestion Scenario with Buffer Overflow
# High traffic burst injected exceeding bottleneck link capacity
# ======================================================================

set ns [new Simulator]

set tracefile [open congestion_trace.tr w]
$ns trace-all $tracefile
set namfile [open congestion.nam w]
$ns namtrace-all $namfile

proc finish {} {
    global ns tracefile namfile
    $ns flush-trace
    close $tracefile
    close $namfile
    puts "Congestion Scenario NS-2 simulation finished."
    exit 0
}

set n0 [$ns node]
set n1 [$ns node]
set n2 [$ns node]
set n3 [$ns node]
set n4 [$ns node]
set n5 [$ns node]
set n6 [$ns node]

# Constrained bottleneck link N3-N5 (5Mb, small queue limit 10 packets)
$ns duplex-link $n0 $n1 100Mb 10ms DropTail
$ns duplex-link $n0 $n2 100Mb 15ms DropTail
$ns duplex-link $n1 $n3 50Mb  12ms DropTail
$ns duplex-link $n2 $n3 50Mb  5ms  DropTail
$ns duplex-link $n3 $n5 5Mb   8ms  DropTail
$ns queue-limit $n3 $n5 10

$ns duplex-link $n1 $n4 20Mb  25ms DropTail
$ns duplex-link $n4 $n5 20Mb  20ms DropTail
$ns duplex-link $n2 $n6 100Mb 10ms DropTail
$ns duplex-link $n6 $n5 100Mb 15ms DropTail
$ns duplex-link $n0 $n6 50Mb  30ms DropTail

$ns rtproto DV

# High rate CBR source generating 10Mb traffic over 5Mb link
set udp [new Agent/UDP]
$ns attach-agent $n0 $udp
set null [new Agent/Null]
$ns attach-agent $n5 $null
$ns connect $udp $null

set cbr [new Application/Traffic/CBR]
$cbr set packetSize_ 1024
$cbr set rate_ 10Mb
$cbr attach-agent $udp

$ns at 0.5 "$cbr start"
$ns at 4.5 "$cbr stop"
$ns at 5.0 "finish"

$ns run
