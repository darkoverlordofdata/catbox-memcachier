# catbox-memjs

memjs adapter for catbox

I can't use catbox-memcached on openshift, because the underlying component, memcached, 
doesn't allow authentication. 

So, this is a copy of catbox-memcached, using memjs, which does allow authentication.

copied from https://github.com/hapijs/catbox-memcached

use a location of the form username:password@host:port

## Quick Start

### Install

```bash
$ cd <project name>
$ npm install catbox-memjs --save

```

### Test

```bash
$ git clone https://github.com/darkoverlordofdata/catbox-memjs.git
$ cd catbox-memjs
$ npm install
$ npm test
```
note - there are some coverage errors coming from memjs.

### Usage

```coffeescript
memcached = if process.env.memcachedcloud? then JSON.parse(process.env.memcachedcloud)
if memcached?
  memcached = memcached.username+':'+memcached.password+'@'+memcached.servers
else
  memcached = 'localhost:11211'


cache = [
  {
    engine: require('catbox-memory')
  }
  {
    name: 'cloud'
    engine: require('catbox-memjs')
    location: memcached
  }
]

server = new Hapi.Server(cache: cache)
```