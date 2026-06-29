const Joi = require('joi');

const authValidationSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address.',
      'any.required': 'Email is required.'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long.',
      'any.required': 'Password is required.'
    })
});

const authValidationSchemaEdit = Joi.object({
  name: Joi.string().required(),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address.',
      'any.required': 'Email is required.'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long.',
      'any.required': 'Password is required.'
    })
});

module.exports = {
  authValidationSchema,
  authValidationSchemaEdit
};
