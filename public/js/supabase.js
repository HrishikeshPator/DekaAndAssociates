// Initialize Supabase Client
// Keys are loaded from config.js
if (!window.SUPABASE_CONFIG) {
    console.error('Supabase Config not found. Please create public/js/config.js');
}
const supabaseUrl = window.SUPABASE_CONFIG.url;
const supabaseKey = window.SUPABASE_CONFIG.key;
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

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
        const { error } = await _supabase
            .from('contact_submissions')
            .insert([
                {
                    name: data.name,
                    email: data.email,
                    phone: data.phone || null,
                    service: data.service || 'General Inquiry',
                    message: data.message,
                    submitted_at: new Date().toISOString() // Optional if using default now() in DB
                }
            ]);

        if (error) throw error;

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

// Expose to window for global access
window.supabaseClient = _supabase;
window.submitContactForm = submitContactForm;

// Google Auth Logic
async function signInWithGoogle() {
    try {
        const { data, error } = await _supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/dashboard.html'
            }
        });
        if (error) throw error;
    } catch (error) {
        console.error('Error signing in with Google:', error.message);
        alert('Error signing in: ' + error.message);
    }
}

async function signOut() {
    const { error } = await _supabase.auth.signOut();
    if (error) console.error('Error signing out:', error.message);
    window.location.href = '/index.html';
}

// Handle Booking Click
async function handleBooking() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        window.location.href = '/dashboard.html';
    } else {
        signInWithGoogle();
    }
}

// Expose Auth functions
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.handleBooking = handleBooking;
