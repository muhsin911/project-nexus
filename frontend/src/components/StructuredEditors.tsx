import { useEffect, useState, type FormEvent } from 'react';
import {
  deleteExperience,
  deleteSkill,
  deleteTestimonial,
  getAdminExperience,
  getAdminSkills,
  getAdminTestimonials,
  getPortfolioProfile,
  saveExperience,
  savePortfolioProfile,
  saveSkill,
  saveTestimonial,
  type ExperienceEntry,
  type ExperienceInput,
  type PortfolioImage,
  type PortfolioProfile,
  type SkillEntry,
  type SkillInput,
  type TestimonialEntry,
  type TestimonialInput,
} from '@/lib/portfolioApi';

const emptyProfile: PortfolioProfile = {
  full_name: 'Your Name',
  headline: 'Software Engineer',
  job_roles: [],
  about_title: '',
  about: '',
  location: '',
  email: '',
  expertise: [],
  social_links: [],
};

const emptyExperience: ExperienceInput = {
  company: '',
  designation: '',
  description: '',
  year: '',
  sort_order: 0,
  published: true,
};

const emptySkill: SkillInput = {
  name: '',
  icon: '',
  group: 'Core',
  sort_order: 0,
  published: true,
};

const emptyTestimonial: TestimonialInput = {
  name: '',
  designation: '',
  content: '',
  image_id: null,
  sort_order: 0,
  published: true,
};

interface Props {
  token: string;
  images: PortfolioImage[];
}

export function StructuredEditors({ token, images }: Props) {
  const [profile, setProfile] = useState(emptyProfile);
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialEntry[]>([]);
  const [experienceForm, setExperienceForm] = useState(emptyExperience);
  const [skillForm, setSkillForm] = useState(emptySkill);
  const [testimonialForm, setTestimonialForm] = useState(emptyTestimonial);
  const [experienceId, setExperienceId] = useState<string>();
  const [skillId, setSkillId] = useState<string>();
  const [testimonialId, setTestimonialId] = useState<string>();
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [nextProfile, nextExperience, nextSkills, nextTestimonials] = await Promise.all([
          getPortfolioProfile(),
          getAdminExperience(token),
          getAdminSkills(token),
          getAdminTestimonials(token),
        ]);
        if (!active) return;
        setProfile(nextProfile);
        setExperience(nextExperience);
        setSkills(nextSkills);
        setTestimonials(nextTestimonials);
      } catch (error) {
        if (active) {
          setFeedback(error instanceof Error ? error.message : 'Portfolio content could not be loaded.');
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [token]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setFeedback('');
    try {
      await action();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'The requested change could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      const form = new FormData(event.currentTarget);
      const socials = String(form.get('social_links') ?? '')
        .split('\n')
        .map((line) => line.split('|').map((part) => part.trim()))
        .filter((parts) => parts[0] && parts[1])
        .map(([label, url, icon = '']) => ({ label, url, icon }));
      const next = {
        ...profile,
        full_name: String(form.get('full_name') ?? ''),
        headline: String(form.get('headline') ?? ''),
        job_roles: String(form.get('job_roles') ?? '').split('\n').map((value) => value.trim()).filter(Boolean),
        about_title: String(form.get('about_title') ?? ''),
        about: String(form.get('about') ?? ''),
        location: String(form.get('location') ?? ''),
        email: String(form.get('email') ?? ''),
        expertise: String(form.get('expertise') ?? '').split('\n').map((value) => value.trim()).filter(Boolean),
        social_links: socials,
      };
      await savePortfolioProfile(next, token);
      setProfile(next);
      setFeedback('Profile and site identity saved.');
    });
  }

  function submitExperience(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      await saveExperience(experienceForm, token, experienceId);
      setExperience(await getAdminExperience(token));
      setExperienceForm(emptyExperience);
      setExperienceId(undefined);
      setFeedback('Experience entry saved.');
    });
  }

  function submitSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      await saveSkill(skillForm, token, skillId);
      setSkills(await getAdminSkills(token));
      setSkillForm(emptySkill);
      setSkillId(undefined);
      setFeedback('Skill saved.');
    });
  }

  function submitTestimonial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      await saveTestimonial(testimonialForm, token, testimonialId);
      setTestimonials(await getAdminTestimonials(token));
      setTestimonialForm(emptyTestimonial);
      setTestimonialId(undefined);
      setFeedback('Testimonial saved.');
    });
  }

  return (
    <div className="structured-editors">
      {feedback && <p className="manage-feedback" role="status">{feedback}</p>}
      <section className="manage-card">
        <div className="manage-card-heading"><div><span>01</span><h2>Profile &amp; site identity</h2></div><p>HOME · ABOUT · SOCIAL</p></div>
        <p className="manage-help">Set your name, roles, introduction, expertise, contact email, and social profile links. Social links use one per line: label | URL | icon name.</p>
        <form className="problem-form" key={JSON.stringify(profile)} onSubmit={submitProfile}>
          <div className="form-row">
            <label>Name<input name="full_name" maxLength={160} required defaultValue={profile.full_name} /></label>
            <label>Primary job title<input name="headline" maxLength={240} required defaultValue={profile.headline} /></label>
          </div>
          <label>Job roles <span className="field-hint">One role per line</span><textarea name="job_roles" rows={3} defaultValue={profile.job_roles.join('\n')} /></label>
          <label>About heading<input name="about_title" maxLength={240} defaultValue={profile.about_title} /></label>
          <label>About<textarea name="about" maxLength={5000} rows={5} defaultValue={profile.about} /></label>
          <div className="form-row">
            <label>Location<input name="location" maxLength={160} defaultValue={profile.location} /></label>
            <label>Contact email<input name="email" maxLength={254} type="email" defaultValue={profile.email} /></label>
          </div>
          <label>Expertise <span className="field-hint">One item per line</span><textarea name="expertise" rows={3} defaultValue={profile.expertise.join('\n')} /></label>
          <label>Social links <span className="field-hint">Label | https://url | icon-name</span><textarea name="social_links" rows={4} defaultValue={profile.social_links.map(({ label, url, icon }) => `${label} | ${url} | ${icon}`).join('\n')} /></label>
          <button className="button button-primary" disabled={busy} type="submit">Save profile</button>
        </form>
      </section>

      <section className="manage-card">
        <div className="manage-card-heading"><div><span>02</span><h2>{experienceId ? 'Edit experience' : 'Add experience'}</h2></div><p>CAREER TIMELINE</p></div>
        <form className="problem-form" onSubmit={submitExperience}>
          <div className="form-row">
            <label>Company<input maxLength={180} required value={experienceForm.company} onChange={(event) => setExperienceForm({ ...experienceForm, company: event.currentTarget.value })} /></label>
            <label>Designation<input maxLength={180} required value={experienceForm.designation} onChange={(event) => setExperienceForm({ ...experienceForm, designation: event.currentTarget.value })} /></label>
          </div>
          <div className="form-row">
            <label>Year or period<input maxLength={60} required placeholder="2022 — 2024" value={experienceForm.year} onChange={(event) => setExperienceForm({ ...experienceForm, year: event.currentTarget.value })} /></label>
            <label>Display order<input min={0} type="number" value={experienceForm.sort_order} onChange={(event) => setExperienceForm({ ...experienceForm, sort_order: Number(event.currentTarget.value) })} /></label>
          </div>
          <label>Description<textarea maxLength={5000} required rows={3} value={experienceForm.description} onChange={(event) => setExperienceForm({ ...experienceForm, description: event.currentTarget.value })} /></label>
          <label className="check-label"><input type="checkbox" checked={experienceForm.published} onChange={(event) => setExperienceForm({ ...experienceForm, published: event.currentTarget.checked })} /> Visible on site</label>
          <button className="button button-primary" disabled={busy} type="submit">{experienceId ? 'Update experience' : 'Add experience'}</button>
        </form>
        <ItemList items={experience} title={(entry) => `${entry.designation} · ${entry.company} · ${entry.year}`} onEdit={(entry) => { setExperienceId(entry.id); setExperienceForm({ company: entry.company, designation: entry.designation, description: entry.description, year: entry.year, sort_order: entry.sort_order, published: entry.published }); }} onDelete={(entry) => void run(async () => { await deleteExperience(entry.id, token); setExperience(await getAdminExperience(token)); })} />
      </section>

      <section className="manage-card">
        <div className="manage-card-heading"><div><span>03</span><h2>{skillId ? 'Edit skill' : 'Add skill'}</h2></div><p>TOOLS &amp; TECHNOLOGIES</p></div>
        <p className="manage-help">Use a small symbol or emoji for the icon (for example ⚛, 🐍, or ◇).</p>
        <form className="problem-form" onSubmit={submitSkill}>
          <div className="form-row">
            <label>Skill name<input maxLength={100} required value={skillForm.name} onChange={(event) => setSkillForm({ ...skillForm, name: event.currentTarget.value })} /></label>
            <label>Icon / symbol<input maxLength={120} placeholder="⚛" value={skillForm.icon} onChange={(event) => setSkillForm({ ...skillForm, icon: event.currentTarget.value })} /></label>
          </div>
          <div className="form-row">
            <label>Category/group<input maxLength={100} value={skillForm.group} onChange={(event) => setSkillForm({ ...skillForm, group: event.currentTarget.value })} /></label>
            <label>Display order<input min={0} type="number" value={skillForm.sort_order} onChange={(event) => setSkillForm({ ...skillForm, sort_order: Number(event.currentTarget.value) })} /></label>
          </div>
          <label className="check-label"><input type="checkbox" checked={skillForm.published} onChange={(event) => setSkillForm({ ...skillForm, published: event.currentTarget.checked })} /> Visible on site</label>
          <button className="button button-primary" disabled={busy} type="submit">{skillId ? 'Update skill' : 'Add skill'}</button>
        </form>
        <ItemList items={skills} title={(entry) => `${entry.name} · ${entry.group}`} onEdit={(entry) => { setSkillId(entry.id); setSkillForm({ name: entry.name, icon: entry.icon, group: entry.group, sort_order: entry.sort_order, published: entry.published }); }} onDelete={(entry) => void run(async () => { await deleteSkill(entry.id, token); setSkills(await getAdminSkills(token)); })} />
      </section>

      <section className="manage-card">
        <div className="manage-card-heading"><div><span>04</span><h2>{testimonialId ? 'Edit testimonial' : 'Add testimonial'}</h2></div><p>RECOMMENDATIONS</p></div>
        <form className="problem-form" onSubmit={submitTestimonial}>
          <div className="form-row">
            <label>Name<input maxLength={160} required value={testimonialForm.name} onChange={(event) => setTestimonialForm({ ...testimonialForm, name: event.currentTarget.value })} /></label>
            <label>Designation<input maxLength={180} required value={testimonialForm.designation} onChange={(event) => setTestimonialForm({ ...testimonialForm, designation: event.currentTarget.value })} /></label>
          </div>
          <label>Testimonial<textarea maxLength={5000} required rows={4} value={testimonialForm.content} onChange={(event) => setTestimonialForm({ ...testimonialForm, content: event.currentTarget.value })} /></label>
          <div className="form-row">
            <label>Portrait image<select value={testimonialForm.image_id ?? ''} onChange={(event) => setTestimonialForm({ ...testimonialForm, image_id: event.currentTarget.value || null })}><option value="">No portrait</option>{images.map((image) => <option key={image.id} value={image.id}>{image.filename}</option>)}</select></label>
            <label>Display order<input min={0} type="number" value={testimonialForm.sort_order} onChange={(event) => setTestimonialForm({ ...testimonialForm, sort_order: Number(event.currentTarget.value) })} /></label>
          </div>
          <label className="check-label"><input type="checkbox" checked={testimonialForm.published} onChange={(event) => setTestimonialForm({ ...testimonialForm, published: event.currentTarget.checked })} /> Visible on site</label>
          <button className="button button-primary" disabled={busy} type="submit">{testimonialId ? 'Update testimonial' : 'Add testimonial'}</button>
        </form>
        <ItemList items={testimonials} title={(entry) => `${entry.name} · ${entry.designation}`} onEdit={(entry) => { setTestimonialId(entry.id); setTestimonialForm({ name: entry.name, designation: entry.designation, content: entry.content, image_id: entry.image_id, sort_order: entry.sort_order, published: entry.published }); }} onDelete={(entry) => void run(async () => { await deleteTestimonial(entry.id, token); setTestimonials(await getAdminTestimonials(token)); })} />
      </section>
    </div>
  );
}

function ItemList<T extends { id: string }>({
  items,
  title,
  onEdit,
  onDelete,
}: {
  items: T[];
  title: (item: T) => string;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
}) {
  if (!items.length) return <p className="manage-help">Nothing added yet.</p>;
  return (
    <ul className="manage-list">
      {items.map((item) => (
        <li key={item.id}>
          <span>{title(item)}</span>
          <div><button onClick={() => onEdit(item)} type="button">Edit</button><button onClick={() => onDelete(item)} type="button">Delete</button></div>
        </li>
      ))}
    </ul>
  );
}
