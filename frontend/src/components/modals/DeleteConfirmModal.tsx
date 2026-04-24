// src/components/modals/DeleteConfirmModal.tsx
import React from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../Icon';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName: string;
  isDeleting?: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  title = 'Delete Confirmation',
  itemName,
  isDeleting = false,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <Modal open={open} onClose={onClose} closeAfterTransition>
          <Box sx={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}>
            <motion.div
              initial={{ opacity: 0, y: -60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                width: '95%',
                maxWidth: 450,
                outline: 'none',
              }}
            >
              <Box sx={{
                bgcolor: 'var(--modal-bg)',
                border: '1px solid var(--modal-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--modal-shadow)',
                p: 4,
                textAlign: 'center',
                transition: 'background-color 0.3s ease-in-out, border-color 0.3s ease-in-out',
              }}>
                {/* Warning Icon */}
                <Box
                  sx={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    bgcolor: 'var(--action-danger-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <Icon icon={faExclamationTriangle} size="2x" color="var(--action-danger)" />
                </Box>

                {/* Title */}
                <Typography variant="h5" fontWeight={700} color="var(--modal-text)" gutterBottom>
                  {title}
                </Typography>

                {/* Message */}
                <Typography variant="body1" color="var(--modal-text-secondary)" sx={{ mb: 4 }}>
                  Are you sure you want to remove <strong>{itemName}</strong>? This action cannot be undone.
                </Typography>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    onClick={onClose}
                    disabled={isDeleting}
                    sx={{
                      px: 4,
                      py: 1.2,
                      bgcolor: 'var(--action-primary)',
                      color: '#ffffff',
                      '&:hover': { bgcolor: 'var(--action-primary-hover)' },
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={onConfirm}
                    disabled={isDeleting}
                    sx={{
                      px: 4,
                      py: 1.2,
                      bgcolor: 'var(--action-danger)',
                      color: '#ffffff',
                      '&:hover': { bgcolor: 'var(--action-danger-hover)' },
                    }}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </Box>
              </Box>
            </motion.div>
          </Box>
        </Modal>
      )}
    </AnimatePresence>
  );
};

export default DeleteConfirmModal;
