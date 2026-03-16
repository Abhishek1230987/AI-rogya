// Quick diagnostic - add this to the browser console to check your token
// Open browser DevTools (F12) → Console → paste this code

(() => {
const token = localStorage.getItem('token');
const user = localStorage.getItem('user');

console.log('%c🔍 AUTH DIAGNOSTIC', 'font-size: 16px; color: blue; font-weight: bold');
console.log('Token exists:', !!token);
if (token) {
console.log('Token (first 50 chars):', token.substring(0, 50));
console.log('Token length:', token.length);
// Try to decode JWT
try {
const payload = token.split('.')[1];
const decoded = JSON.parse(atob(payload));
console.log('Token Payload:', decoded);
console.log('User ID:', decoded.id);
console.log('Token exp:', decoded.exp ? new Date(decoded.exp \* 1000) : 'No expiration');
} catch (e) {
console.log('Could not decode token:', e.message);
}
}

console.log('\nUser data:', user ? JSON.parse(user) : 'None');
console.log('\n%c✅ If token exists and has user ID, everything is fine', 'color: green');
console.log('%c❌ If no token, you need to login first', 'color: red');
})();
