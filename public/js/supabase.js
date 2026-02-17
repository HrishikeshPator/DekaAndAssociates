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

// Expose to window for global access if needed, or attach event listeners here
window.submitContactForm = submitContactForm;
