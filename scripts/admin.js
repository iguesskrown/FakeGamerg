document.addEventListener('DOMContentLoaded', () => {
  const config = window.SUPABASE_CONFIG;
  const status = document.querySelector('#admin-status');
  const loginForm = document.querySelector('#admin-login');
  const uploader = document.querySelector('#thumbnail-uploader');
  const uploadForm = document.querySelector('#thumbnail-form');
  const preview = document.querySelector('#admin-preview-image');
  const fileInput = document.querySelector('#thumbnail-file');
  const identity = document.querySelector('#admin-identity');
  const signOut = document.querySelector('#admin-sign-out');

  if (!config?.url || !config?.anonKey) {
    status.textContent = 'Connect the Supabase project to enable creator uploads.';
    loginForm.hidden = true;
    return;
  }

  const client = window.supabase.createClient(config.url, config.anonKey);
  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  };

  const loadCurrentThumbnail = async () => {
    const { data, error } = await client
      .from('site_settings')
      .select('featured_thumbnail')
      .eq('id', 'featured')
      .maybeSingle();
    if (error) throw error;
    if (data?.featured_thumbnail) preview.src = data.featured_thumbnail;
  };

  const showSession = async (session) => {
    if (!session) {
      loginForm.hidden = false;
      uploader.hidden = true;
      return;
    }

    const { data, error } = await client.rpc('is_thumbnail_admin');
    if (error || !data) {
      await client.auth.signOut();
      loginForm.hidden = false;
      uploader.hidden = true;
      setStatus('This account is not authorized to manage thumbnails.', true);
      return;
    }

    loginForm.hidden = true;
    uploader.hidden = false;
    identity.textContent = session.user.email;
    setStatus('You are signed in. Publishing updates the live portfolio.');
    try {
      await loadCurrentThumbnail();
    } catch {
      setStatus('Could not load the current thumbnail. Check the Supabase setup.', true);
    }
  };

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const email = formData.get('email');
    const password = formData.get('password');
    setStatus('Signing in…');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus('Sign-in failed. Check your account details and try again.', true);
      return;
    }
    await showSession(data.session);
  });

  uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = fileInput.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 15 * 1024 * 1024) {
      setStatus('Choose a JPG, PNG, WebP or GIF image smaller than 15 MB.', true);
      return;
    }

    const extension = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'webp';
    const path = `thumbnails/${crypto.randomUUID()}.${extension}`;
    const submit = uploadForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    setStatus('Uploading thumbnail…');

    const { error: uploadError } = await client.storage
      .from('site-thumbnails')
      .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });

    if (uploadError) {
      submit.disabled = false;
      setStatus('Upload failed. Check the bucket and admin policies.', true);
      return;
    }

    const { data: image } = client.storage.from('site-thumbnails').getPublicUrl(path);
    const { error: updateError } = await client
      .from('site_settings')
      .update({ featured_thumbnail: image.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', 'featured');

    submit.disabled = false;
    if (updateError) {
      setStatus('The image uploaded, but the live thumbnail could not be updated.', true);
      return;
    }

    preview.src = image.publicUrl;
    fileInput.value = '';
    setStatus('Published. The featured thumbnail is now live across the website.');
  });

  signOut.addEventListener('click', async () => {
    await client.auth.signOut();
    setStatus('Signed out.');
  });

  client.auth.onAuthStateChange((_event, session) => {
    void showSession(session);
  });
  client.auth.getSession().then(({ data }) => showSession(data.session));
});