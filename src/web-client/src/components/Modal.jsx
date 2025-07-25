import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const Modal = ({ open, title, children, onClose, onConfirm, confirmText = "Confirm", cancelText = "Cancel" }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: 200,
        }
      }}
    >
      {title && (
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          {title}
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
      )}
      
      <DialogContent>
        {children}
      </DialogContent>
      
      {/* Show action bar only if onConfirm is defined */}
      {onConfirm && (
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={onClose} variant="outlined">
            {cancelText}
          </Button>
          <Button onClick={onConfirm} variant="contained" color="primary" autoFocus>
            {confirmText}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default Modal;
