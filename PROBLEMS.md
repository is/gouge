internal/buffer.js:44
    throw new ERR_OUT_OF_RANGE('value', `>= ${min} and <= ${max}`, value);
    ^

RangeError [ERR_OUT_OF_RANGE]: The value of "value" is out of range. It must be >= -32768 and <= 32767. Received 32768
    at checkInt (internal/buffer.js:44:11)
    at writeU_Int16BE (internal/buffer.js:666:3)
    at Buffer.writeInt16BE (internal/buffer.js:728:10)
    at a._writeNumberValue (/home/admin/src/gouge/g.js:2:45680)
    at a.writeInt16BE (/home/admin/src/gouge/g.js:2:38496)
    at Object.d [as data] (/home/admin/src/gouge/g.js:2:12028)
    at t.Channel.sendData (/home/admin/src/gouge/g.js:2:75260)
    at Timeout.flushSmallBuffer [as _onTimeout] (/home/admin/src/gouge/g.js:2:75123)
    at listOnTimeout (timers.js:329:17)
    at processTimers (timers.js:271:5)
```
internal/buffer.js:44
    throw new ERR_OUT_OF_RANGE('value', `>= ${min} and <= ${max}`, value);
    ^

RangeError [ERR_OUT_OF_RANGE]: The value of "value" is out of range. It must be >= -32768 and <= 32767. Received 32768
    at checkInt (internal/buffer.js:44:11)
    at writeU_Int16BE (internal/buffer.js:666:3)
    at Buffer.writeInt16BE (internal/buffer.js:728:10)
    at a._writeNumberValue (/home/admin/src/gouge/g.js:2:45680)
    at a.writeInt16BE (/home/admin/src/gouge/g.js:2:38496)
    at Object.d [as data] (/home/admin/src/gouge/g.js:2:12028)
    at t.Channel.sendData (/home/admin/src/gouge/g.js:2:75260)
    at Timeout.flushSmallBuffer [as _onTimeout] (/home/admin/src/gouge/g.js:2:75123)
    at listOnTimeout (timers.js:329:17)
    at processTimers (timers.js:271:5)
```
