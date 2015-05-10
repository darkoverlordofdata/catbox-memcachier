catbox-memjs
============

memjs adapter for catbox

I can't use catbox-memcached on openshift, because the underlying component, memcached, 
doesn't allow authentication. This is a copy of catbox-memcached, using memjs.

copied from https://github.com/hapijs/catbox-memcached

use a location of the form <username>:<password>@<host>:<port>
