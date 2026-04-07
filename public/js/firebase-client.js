// Initialize Firebase App if not already initialized
if (!firebase.apps.length) {
    if (typeof firebaseConfig !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
    } else {
        console.error('Firebase Config not found. Please ensure firebase-config.js is loaded.');
        alert('System Error: Configuration missing. Please refresh the page.');
    }
}

const auth = firebase.auth();
const db = firebase.database();

// Function to handle Contact Form Submission
async function submitContactForm(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Basic validation
    if (!data.name || !data.email || !data.message) {
        alert('Please fill in all required fields.');
        return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = 'Sending...';
    submitBtn.disabled = true;

    try {
        await db.ref('contact_submissions').push({
            name: data.name,
            email: data.email,
            phone: data.phone || null,
            service: data.service || 'General Inquiry',
            message: data.message,
            submitted_at: new Date().toISOString()
        });

        alert('Message sent successfully!');
        form.reset();
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('Failed to send message. Please try again or contact us directly.');
    } finally {
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
    }
}

// Google Auth Logic
async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
        window.location.href = '/dashboard.html';
    } catch (error) {
        console.error('Error signing in with Google:', error.message);
        alert('Error signing in: ' + error.message);
    }
}

async function signOut() {
    try {
        await auth.signOut();
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Error signing out:', error.message);
    }
}

// Handle Booking Click
function handleBooking() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            window.location.href = '/dashboard.html';
        } else {
            signInWithGoogle();
        }
    });
}

// Expose functions to window
window.firebaseClient = { auth, db };
window.submitContactForm = submitContactForm;
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.handleBooking = handleBooking;
