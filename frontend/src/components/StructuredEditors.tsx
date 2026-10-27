import { useEffect, useState, type FormEvent } from 'react';
import {
  deleteCertification,
  deleteEducation,
  deleteExperience,
  deleteFaq,
  deleteShowcase,
  deleteSkill,
  deleteTestimonial,
  getAdminExperience,
  getAdminCertifications,
  getAdminEducation,
  getAdminFaqs,
  getAdminShowcase,
  getAdminSkills,
  getAdminTestimonials,
  getPortfolioProfile,
  saveExperience,
  saveCertification,
  saveEducation,
  saveFaq,
  savePortfolioProfile,
  saveShowcase,
  saveSkill,
  saveTestimonial,
  type ExperienceEntry,
  type ExperienceInput,
  type CertificationEntry,
  type CertificationInput,
  type EducationEntry,
  type EducationInput,
  type FAQEntry,
  type FAQInput,
  type PortfolioImage,
  type PortfolioProfile,
  type SkillEntry,
  type SkillInput,
  type ShowcaseInput,
  type ShowcaseSlide,
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
  phone: '',
  address: '',
  email: '',
  booking_url: '',
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

const emptyEducation: EducationInput = {
  degree: '',
  institution: '',
  period: '',
  sort_order: 0,
  published: true,
};

const emptyCertification: CertificationInput = {
  name: '',
  issuer: '',
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

const emptyFaq: FAQInput = { question: '', answer: '', sort_order: 0, published: true };
const emptyShowcase: ShowcaseInput = {
  eyebrow: '',
  title: '',
  description: '',
  image_id: null,
  action_label: '',
  action_url: '',
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
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [certifications, setCertifications] = useState<CertificationEntry[]>([]);
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialEntry[]>([]);
  const [faqs, setFaqs] = useState<FAQEntry[]>([]);
  const [slides, setSlides] = useState<ShowcaseSlide[]>([]);
  const [experienceForm, setExperienceForm] = useState(emptyExperience);
  const [educationForm, setEducationForm] = useState(emptyEducation);
  const [certificationForm, setCertificationForm] = useState(emptyCertification);
  const [skillForm, setSkillForm] = useState(emptySkill);
  const [testimonialForm, setTestimonialForm] = useState(emptyTestimonial);
  const [faqForm, setFaqForm] = useState(emptyFaq);
  const [showcaseForm, setShowcaseForm] = useState(emptyShowcase);
  const [experienceId, setExperienceId] = useState<string>();
  const [educationId, setEducationId] = useState<string>();
  const [certificationId, setCertificationId] = useState<string>();
  const [skillId, setSkillId] = useState<string>();
  const [testimonialId, setTestimonialId] = useState<string>();
  const [faqId, setFaqId] = useState<string>();
  const [showcaseId, setShowcaseId] = useState<string>();
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [nextProfile, nextExperience, nextEducation, nextCertifications, nextSkills, nextTestimonials, nextFaqs, nextShowcase] = await Promise.all([
          getPortfolioProfile(),
          getAdminExperience(token),
          getAdminEducation(token),
          getAdminCertifications(token),
          getAdminSkills(token),
          getAdminTestimonials(token),
          getAdminFaqs(token),
          getAdminShowcase(token),
        ]);
        if (!active) return;
        setProfile(nextProfile);
        setExperience(nextExperience);
        setEducation(nextEducation);
        setCertifications(nextCertifications);
        setSkills(nextSkills);
        setTestimonials(nextTestimonials);
        setFaqs(nextFaqs);
        setSlides(nextShowcase);
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
        phone: String(form.get('phone') ?? ''),
        address: String(form.get('address') ?? ''),
        email: String(form.get('email') ?? ''),
        booking_url: String(form.get('booking_url') ?? ''),
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

  function submitEducation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      await saveEducation(educationForm, token, educationId);
      setEducation(await getAdminEducation(token));
      setEducationForm(emptyEducation);
      setEducationId(undefined);
      setFeedback('Education entry saved.');
    });
  }

  function submitCertification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      await saveCertification(certificationForm, token, certificationId);
      setCertifications(await getAdminCertifications(token));
      setCertificationForm(emptyCertification);
      setCertificationId(undefined);
      setFeedback('Certification saved.');
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

  function submitFaq(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      await saveFaq(faqForm, token, faqId);
      setFaqs(await getAdminFaqs(token));
      setFaqForm(emptyFaq);
      setFaqId(undefined);
      setFeedback('FAQ saved.');
    });
  }

  function submitShowcase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      await saveShowcase(showcaseForm, token, showcaseId);
      setSlides(await getAdminShowcase(token));
      setShowcaseForm(emptyShowcase);
      setShowcaseId(undefined);
      setFeedback('Carousel slide saved.');
    });
  }

  return (
    <div className="structured-editors">
      {feedback && <p className="manage-feedback" role="status">{feedback}</p>}
      <section className="manage-card">
        <div className="manage-card-heading"><div><span>01</span><h2>Profile &amp; site identity</h2></div><p>HOME · ABOUT · SOCIAL</p></div>
        <p className="manage-help">Edit identity, location, direct contact details, booking link, expertise, and social profiles.</p>
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
          <div className="form-row">
            <label>Phone number<input name="phone" maxLength={40} type="tel" defaultValue={profile.phone} /></label>
            <label>Address / public location<input name="address" maxLength={500} defaultValue={profile.address} /></label>
          </div>
          <label>Appointment booking URL<input name="booking_url" maxLength={2048} type="url" placeholder="https://cal.com/your-name" defaultValue={profile.booking_url} /></label>
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
        <div className="manage-card-heading"><div><span>03</span><h2>{educationId ? 'Edit education' : 'Add education'}</h2></div><p>EDUCATION</p></div>
        <form className="problem-form" onSubmit={submitEducation}>
          <div className="form-row">
            <label>Degree or qualification<input maxLength={180} required value={educationForm.degree} onChange={(event) => setEducationForm({ ...educationForm, degree: event.currentTarget.value })} /></label>
            <label>Institution<input maxLength={180} required value={educationForm.institution} onChange={(event) => setEducationForm({ ...educationForm, institution: event.currentTarget.value })} /></label>
          </div>
          <div className="form-row">
            <label>Period<input maxLength={80} required placeholder="2022 — 2024" value={educationForm.period} onChange={(event) => setEducationForm({ ...educationForm, period: event.currentTarget.value })} /></label>
            <label>Display order<input min={0} type="number" value={educationForm.sort_order} onChange={(event) => setEducationForm({ ...educationForm, sort_order: Number(event.currentTarget.value) })} /></label>
          </div>
          <label className="check-label"><input type="checkbox" checked={educationForm.published} onChange={(event) => setEducationForm({ ...educationForm, published: event.currentTarget.checked })} /> Visible on site</label>
          <button className="button button-primary" disabled={busy} type="submit">{educationId ? 'Update education' : 'Add education'}</button>
        </form>
        <ItemList items={education} title={(entry) => `${entry.degree} · ${entry.institution} · ${entry.period}`} onEdit={(entry) => { setEducationId(entry.id); setEducationForm({ degree: entry.degree, institution: entry.institution, period: entry.period, sort_order: entry.sort_order, published: entry.published }); }} onDelete={(entry) => void run(async () => { await deleteEducation(entry.id, token); setEducation(await getAdminEducation(token)); })} />
      </section>

      <section className="manage-card">
        <div className="manage-card-heading"><div><span>04</span><h2>{certificationId ? 'Edit certification' : 'Add certification'}</h2></div><p>CERTIFICATIONS</p></div>
        <form className="problem-form" onSubmit={submitCertification}>
          <div className="form-row">
            <label>Certification name<input maxLength={240} required value={certificationForm.name} onChange={(event) => setCertificationForm({ ...certificationForm, name: event.currentTarget.value })} /></label>
            <label>Issuing organization<input maxLength={180} value={certificationForm.issuer} onChange={(event) => setCertificationForm({ ...certificationForm, issuer: event.currentTarget.value })} /></label>
          </div>
          <div className="form-row">
            <label>Display order<input min={0} type="number" value={certificationForm.sort_order} onChange={(event) => setCertificationForm({ ...certificationForm, sort_order: Number(event.currentTarget.value) })} /></label>
            <label className="check-label"><input type="checkbox" checked={certificationForm.published} onChange={(event) => setCertificationForm({ ...certificationForm, published: event.currentTarget.checked })} /> Visible on site</label>
          </div>
          <button className="button button-primary" disabled={busy} type="submit">{certificationId ? 'Update certification' : 'Add certification'}</button>
        </form>
        <ItemList items={certifications} title={(entry) => `${entry.name}${entry.issuer ? ` · ${entry.issuer}` : ''}`} onEdit={(entry) => { setCertificationId(entry.id); setCertificationForm({ name: entry.name, issuer: entry.issuer, sort_order: entry.sort_order, published: entry.published }); }} onDelete={(entry) => void run(async () => { await deleteCertification(entry.id, token); setCertifications(await getAdminCertifications(token)); })} />
      </section>

      <section className="manage-card">
        <div className="manage-card-heading"><div><span>05</span><h2>{skillId ? 'Edit skill' : 'Add skill'}</h2></div><p>TOOLS &amp; TECHNOLOGIES</p></div>
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
        <div className="manage-card-heading"><div><span>06</span><h2>{testimonialId ? 'Edit testimonial' : 'Add testimonial'}</h2></div><p>RECOMMENDATIONS</p></div>
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

      <section className="manage-card">
        <div className="manage-card-heading"><div><span>07</span><h2>{faqId ? 'Edit FAQ' : 'Add a frequently asked question'}</h2></div><p>HELPFUL DETAILS</p></div>
        <form className="problem-form" onSubmit={submitFaq}>
          <label>Question<input maxLength={300} required value={faqForm.question} onChange={(event) => setFaqForm({ ...faqForm, question: event.currentTarget.value })} /></label>
          <label>Answer<textarea maxLength={5000} required rows={4} value={faqForm.answer} onChange={(event) => setFaqForm({ ...faqForm, answer: event.currentTarget.value })} /></label>
          <div className="form-row">
            <label>Display order<input min={0} type="number" value={faqForm.sort_order} onChange={(event) => setFaqForm({ ...faqForm, sort_order: Number(event.currentTarget.value) })} /></label>
            <label className="check-label"><input type="checkbox" checked={faqForm.published} onChange={(event) => setFaqForm({ ...faqForm, published: event.currentTarget.checked })} /> Visible on site</label>
          </div>
          <button className="button button-primary" disabled={busy} type="submit">{faqId ? 'Update FAQ' : 'Add FAQ'}</button>
        </form>
        <ItemList items={faqs} title={(entry) => entry.question} onEdit={(entry) => { setFaqId(entry.id); setFaqForm({ question: entry.question, answer: entry.answer, sort_order: entry.sort_order, published: entry.published }); }} onDelete={(entry) => void run(async () => { await deleteFaq(entry.id, token); setFaqs(await getAdminFaqs(token)); })} />
      </section>

      <section className="manage-card">
        <div className="manage-card-heading"><div><span>08</span><h2>{showcaseId ? 'Edit carousel slide' : 'Add a carousel slide'}</h2></div><p>HOMEPAGE HIGHLIGHTS</p></div>
        <p className="manage-help">Slides rotate automatically. Add optional imagery and a button to guide visitors to a project, service, or booking page.</p>
        <form className="problem-form" onSubmit={submitShowcase}>
          <div className="form-row">
            <label>Small label<input maxLength={120} value={showcaseForm.eyebrow} onChange={(event) => setShowcaseForm({ ...showcaseForm, eyebrow: event.currentTarget.value })} /></label>
            <label>Slide title<input maxLength={200} required value={showcaseForm.title} onChange={(event) => setShowcaseForm({ ...showcaseForm, title: event.currentTarget.value })} /></label>
          </div>
          <label>Description<textarea maxLength={5000} required rows={4} value={showcaseForm.description} onChange={(event) => setShowcaseForm({ ...showcaseForm, description: event.currentTarget.value })} /></label>
          <div className="form-row">
            <label>Slide image<select value={showcaseForm.image_id ?? ''} onChange={(event) => setShowcaseForm({ ...showcaseForm, image_id: event.currentTarget.value || null })}><option value="">Generated visual</option>{images.map((image) => <option key={image.id} value={image.id}>{image.filename}</option>)}</select></label>
            <label>Display order<input min={0} type="number" value={showcaseForm.sort_order} onChange={(event) => setShowcaseForm({ ...showcaseForm, sort_order: Number(event.currentTarget.value) })} /></label>
          </div>
          <div className="form-row">
            <label>Button label<input maxLength={80} value={showcaseForm.action_label} onChange={(event) => setShowcaseForm({ ...showcaseForm, action_label: event.currentTarget.value })} /></label>
            <label>Button link<input maxLength={2048} placeholder="/#contact or https://…" value={showcaseForm.action_url} onChange={(event) => setShowcaseForm({ ...showcaseForm, action_url: event.currentTarget.value })} /></label>
          </div>
          <label className="check-label"><input type="checkbox" checked={showcaseForm.published} onChange={(event) => setShowcaseForm({ ...showcaseForm, published: event.currentTarget.checked })} /> Visible in carousel</label>
          <button className="button button-primary" disabled={busy} type="submit">{showcaseId ? 'Update slide' : 'Add slide'}</button>
        </form>
        <ItemList items={slides} title={(entry) => `${entry.title}${entry.published ? '' : ' · Draft'}`} onEdit={(entry) => { setShowcaseId(entry.id); setShowcaseForm({ eyebrow: entry.eyebrow, title: entry.title, description: entry.description, image_id: entry.image_id, action_label: entry.action_label, action_url: entry.action_url, sort_order: entry.sort_order, published: entry.published }); }} onDelete={(entry) => void run(async () => { await deleteShowcase(entry.id, token); setSlides(await getAdminShowcase(token)); })} />
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
