document.addEventListener('DOMContentLoaded', () => {
  const menuButton = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.nav-menu');

  menuButton?.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    navMenu.classList.toggle('open', !isOpen);
  });

  document.querySelectorAll('.nav-menu a').forEach((link) => {
    link.addEventListener('click', () => {
      menuButton?.setAttribute('aria-expanded', 'false');
      navMenu?.classList.remove('open');
    });
  });

  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  reveals.forEach((element) => observer.observe(element));

  const filters = document.querySelectorAll('.filter');
  const projects = [...document.querySelectorAll('.project')];
  filters.forEach((filter) => {
    filter.addEventListener('click', () => {
      const category = filter.dataset.filter;
      filters.forEach((button) => button.classList.toggle('active', button === filter));
      projects.forEach((project) => {
        project.classList.toggle('is-hidden', category !== 'all' && project.dataset.category !== category);
      });
    });
  });

  const dialog = document.querySelector('#lightbox');
  const preview = document.querySelector('#lightbox-image');
  const caption = document.querySelector('#lightbox-title');
  const close = document.querySelector('.lightbox-close');
  const previous = document.querySelector('.lightbox-arrow.previous');
  const next = document.querySelector('.lightbox-arrow.next');
  let currentProject = 0;
  const visibleProjects = () => projects.filter((project) => !project.classList.contains('is-hidden'));

  const showProject = (index) => {
    const current = visibleProjects();
    currentProject = (index + current.length) % current.length;
    const project = current[currentProject];
    preview.src = project.dataset.image;
    preview.alt = project.querySelector('img').alt;
    caption.textContent = project.dataset.title;
  };

  projects.forEach((project) => {
    project.addEventListener('click', () => {
      currentProject = visibleProjects().indexOf(project);
      showProject(currentProject);
      dialog.showModal();
    });
  });
  close?.addEventListener('click', () => dialog.close());
  previous?.addEventListener('click', () => showProject(currentProject - 1));
  next?.addEventListener('click', () => showProject(currentProject + 1));
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.addEventListener('keydown', (event) => {
    if (!dialog?.open) return;
    if (event.key === 'ArrowLeft') showProject(currentProject - 1);
    if (event.key === 'ArrowRight') showProject(currentProject + 1);
  });

  document.querySelector('#year').textContent = new Date().getFullYear();

  const portrait = document.querySelector('.about-portrait');
  if (portrait) {
    const canvas = document.createElement('canvas');
    canvas.className = 'skin-viewer';
    canvas.setAttribute('aria-label', 'Interactive 3D Minecraft model of Krown. Drag to rotate and use the mouse wheel to zoom.');
    portrait.append(canvas);

    const viewerScript = document.createElement('script');
    viewerScript.src = 'https://unpkg.com/skinview3d@3.4.2/bundles/skinview3d.bundle.js';
    viewerScript.onload = () => {
      try {
        const size = Math.min(portrait.clientWidth, 380);
        const viewer = new window.skinview3d.SkinViewer({ canvas, width: size, height: size });
        viewer.fov = 45;
        viewer.zoom = 0.83;
        viewer.autoRotate = true;
        viewer.autoRotateSpeed = 0.75;
        viewer.controls.enableRotate = true;
        viewer.controls.enableZoom = true;
        viewer.controls.enablePan = false;
        viewer.globalLight.intensity = 2.6;
        viewer.cameraLight.intensity = 0.9;
        viewer.animation = new window.skinview3d.IdleAnimation();

        viewer.loadSkin('assets/images/krown-skin.webp').then(() => {
          portrait.classList.add('viewer-ready');
          new ResizeObserver(() => {
            const nextSize = Math.min(portrait.clientWidth, 380);
            viewer.width = nextSize;
            viewer.height = nextSize;
          }).observe(portrait);
        }).catch(() => {
          canvas.remove();
          portrait.classList.add('viewer-unavailable');
        });
      } catch {
        canvas.remove();
        portrait.classList.add('viewer-unavailable');
      }
    };
    viewerScript.onerror = () => {
      canvas.remove();
      portrait.classList.add('viewer-unavailable');
    };
    document.head.append(viewerScript);
  }
});
