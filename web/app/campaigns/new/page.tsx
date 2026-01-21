'use client';
import React, { useState, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormHelperText from '@mui/material/FormHelperText';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import Stack from '@mui/material/Stack';
import Input from '@mui/material/Input';
import { useCreateCampaign } from '../../../lib/hooks/useCampaigns';
import { useAuth } from '../../../lib/auth';
import { useRouter } from 'next/navigation';
import CustomizedSteppers from '@/components/common/Stepper';

const steps = ['Campaign Info', 'Audience', 'Channel', 'Content', 'Review & Trigger'];

export default function NewCampaignPage() {
  const [active, setActive] = useState(0);
  const DRAFT_KEY = 'notifly_new_campaign_draft_v1';
  const [draft, setDraft] = useState<any | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const skipNextPersist = React.useRef(false);
  const [name, setName] = useState('');
  const [audienceSize, setAudienceSize] = useState<number | null>(null);
  const [recipients, setRecipients] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState('email');

  const create = useCreateCampaign();
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setDraft(parsed);
        // only show resume when a campaign name exists
        if (parsed && parsed.name && String(parsed.name).trim().length > 0) {
          setShowResumePrompt(true);
        }
        // prevent the immediate persist effect from overwriting the saved draft
        skipNextPersist.current = true;
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  const next = () => setActive((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setActive((s) => Math.max(s - 1, 0));

  const handleUpload = (file?: File) => {
    if (!file) return;
    setUploadedFileName(file.name);
    // Basic mock: if CSV, try to read and count lines (best-effort)
    if (file.name.toLowerCase().endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = String(e.target?.result || '');
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);
        setAudienceSize(lines.length);
        // keep recipients in sync so we can send them to the API
        setRecipients(lines.join('\n'));
      };
      reader.readAsText(file);
    } else {
      setAudienceSize(Math.max(1, Math.round(file.size / 100)));
    }
  };

  const parseRecipients = (text: string) => {
    const parts = text
      .split(/[\n,]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    return parts;
  };

  const handleSubmit = async () => {
    const recipientsArr = parseRecipients(recipients || '');
    const payload: any = {
      name,
      channel,
      recipients: recipientsArr,
      payload: { subject, body },
    };
    // include tenantId when available from auth; fallback to decoding accessToken
    let tenantId = state?.user?.tenantId;
    if (!tenantId) {
      try {
        const at = localStorage.getItem('accessToken');
        if (at) {
          const decoded = JSON.parse(atob(at.split('.')[1]));
          tenantId = decoded?.tenantId;
        }
      } catch (e) {
        // ignore
      }
    }
    if (tenantId) payload.tenantId = tenantId;
    try {
      await create.mutateAsync(payload);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (e) {
        // ignore
      }
      router.push('/campaigns');
    } catch (e) {
      // error handled by mutation state
    }
  };

  // persist draft on change
  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    const payload = {
      active,
      name,
      audienceSize,
      recipients,
      uploadedFileName,
      subject,
      body,
      channel,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch (e) {
      // ignore storage errors
    }
  }, [active, name, audienceSize, recipients, uploadedFileName, subject, body, channel]);

  const resumeDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setActive(typeof parsed.active === 'number' ? parsed.active : 0);
      setName(parsed.name || '');
      // coerce audienceSize to number or null
      const asize = parsed.audienceSize;
      setAudienceSize(typeof asize === 'number' ? asize : asize ? Number(asize) || null : null);
      setRecipients(parsed.recipients || '');
      setUploadedFileName(parsed.uploadedFileName || null);
      setSubject(parsed.subject || '');
      setBody(parsed.body || '');
      setChannel(parsed.channel || 'email');
      setShowResumePrompt(false);
      setDraft(parsed);
    } catch (e) {
      // if parse fails do nothing
    }
  };

  const startFresh = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      // ignore
    }
    setDraft(null);
    setShowResumePrompt(false);
    setActive(0);
    setName('');
    setAudienceSize(null);
    setRecipients('');
    setUploadedFileName(null);
    setSubject('');
    setBody('');
    setChannel('email');
  };

  const [snackOpen, setSnackOpen] = useState(false);
  useEffect(() => {
    if (create.isError) setSnackOpen(true);
  }, [create.isError]);

  const handleSnackClose = (_: any, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackOpen(false);
  };

  const canProceed = (step: number) => {
    if (step === 0) {
      return String(name || '').trim().length > 0;
    }
    if (step === 1) {
      return !!(typeof audienceSize === 'number' && audienceSize > 0);
    }
    if (step === 2) {
      return String(subject || '').trim().length > 0 && String(body || '').trim().length > 0;
    }
    return true;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 12 }}>
        <CustomizedSteppers activeStep={active} />
      </Box>
      {showResumePrompt && (
        <Box sx={{ maxWidth: 900, mx: 'auto', mb: 3 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 600 }}>Found a saved draft</Typography>
              <Typography variant="body2" color="text.secondary">
                Resume where you left off or start a fresh campaign.
              </Typography>
            </Box>
            <Box>
              <Button onClick={startFresh} sx={{ mr: 1 }}>
                Start Fresh
              </Button>
              <Button
                onClick={resumeDraft}
                sx={{
                  backgroundImage:
                    'linear-gradient(95deg,rgb(242,113,33) 0%,rgb(233,64,87) 50%,rgb(138,35,135) 100%)',
                  color: '#fff',
                  '&:hover': { filter: 'brightness(0.98)' },
                }}
                variant="contained"
              >
                Resume
              </Button>
            </Box>
          </Paper>
        </Box>
      )}
      {active === 0 && (
        <Box sx={{ display: 'grid', gap: 2, maxWidth: 600, mx: 'auto' }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Divider sx={{ my: 2, width: '60%', mx: 'auto' }} />
          <FormControl>
            <InputLabel id="channel-select-label">Channel</InputLabel>
            <Select
              labelId="channel-select-label"
              value={channel}
              label="Channel"
              onChange={(e) => setChannel(String(e.target.value))}
            >
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="sms" disabled>
                SMS (coming soon)
              </MenuItem>
              <MenuItem value="push" disabled>
                Push (coming soon)
              </MenuItem>
            </Select>
            <FormHelperText>
              Email selected by default. SMS and Push are coming soon.
            </FormHelperText>
          </FormControl>
        </Box>
      )}

      {active === 1 && (
        <Box sx={{ display: 'grid', gap: 2, maxWidth: 900, mx: 'auto', textAlign: 'center' }}>
          <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.paper' }}>
            <input
              ref={(el) => {
                fileInputRef.current = el;
              }}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => handleUpload(e.target.files?.[0])}
            />
            <Stack direction="column" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload CSV
              </Button>

              {uploadedFileName && (
                <Typography variant="caption" color="text.secondary">
                  Uploaded: {uploadedFileName}
                </Typography>
              )}
            </Stack>
          </Paper>
          <Box>
            <Divider sx={{ mx: 20 }}>
              <Typography variant="body1">OR</Typography>
            </Divider>
          </Box>
          <TextField
            label="Recipients"
            placeholder={'alice@example.com\nbob@example.com\n... or comma,separated@example.com'}
            value={recipients}
            onChange={(e) => {
              setRecipients(e.target.value);
              const parsed = parseRecipients(e.target.value);
              setAudienceSize(parsed.length || null);
            }}
            multiline
            minRows={6}
            fullWidth
          />

          <Typography>
            Audience size: {audienceSize ?? '(upload CSV or enter recipients)'}
          </Typography>
        </Box>
      )}

      {active === 2 && (
        <Box sx={{ display: 'grid', gap: 2, maxWidth: 900, mx: 'auto' }}>
          <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <TextField
            label="Body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            multiline
            minRows={6}
          />
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2">Live Preview</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="h6">{subject || '(no subject)'}</Typography>
            <Typography>{body || '(no body)'}</Typography>
          </Paper>
        </Box>
      )}

      {active === 3 && (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Review
          </Typography>
          <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.paper' }}>
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}
            >
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Name
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{name || '(not provided)'}</Typography>

                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                  Audience
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{audienceSize ?? '(not provided)'}</Typography>

                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                  Channel
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>
                  {channel === 'email' ? 'Email' : channel}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Subject
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{subject || '(no subject)'}</Typography>

                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                  Body
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mt: 1, maxHeight: 220, overflow: 'auto' }}>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>{body || '(no body)'}</Typography>
                </Paper>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, mt: 8, justifyContent: 'center', alignItems: 'center' }}>
        <IconButton onClick={back} disabled={active === 0} aria-label="previous" size="large">
          <ArrowBackIosNewIcon />
        </IconButton>

        {active < 3 ? (
          <IconButton
            color="primary"
            onClick={next}
            aria-label="next"
            size="large"
            disabled={!canProceed(active)}
          >
            <ArrowForwardIosIcon />
          </IconButton>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={(create as any).isLoading}
            sx={{
              backgroundImage:
                'linear-gradient(95deg,rgb(242,113,33) 0%,rgb(233,64,87) 50%,rgb(138,35,135) 100%)',
              color: '#fff',
              textTransform: 'uppercase',
              px: 4,
              py: 1.2,
              boxShadow: '0 6px 18px rgba(138,35,135,0.18)',
              '&:hover': {
                boxShadow: '0 8px 22px rgba(138,35,135,0.22)',
                filter: 'brightness(0.98)',
              },
            }}
          >
            TRIGGER CAMPAIGN
          </Button>
        )}
      </Box>

      {/* show mutation/form errors in a bottom-left snackbar */}
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        open={snackOpen}
        autoHideDuration={4000}
        onClose={handleSnackClose}
      >
        <Alert onClose={handleSnackClose} severity="error" sx={{ width: '100%' }}>
          {(create.error as any)?.response?.data?.message ||
            (create.error as any)?.message ||
            'Failed to create campaign'}
        </Alert>
      </Snackbar>
    </Box>
  );
}
