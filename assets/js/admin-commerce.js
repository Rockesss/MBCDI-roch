/**
 * MBCDI Admin Commerce
 * Gestion de l'upload de logo
 * @version 5.5.0
 */
(function($) {
    'use strict';

    $(document).ready(function() {
        // Vérifier qu'on est sur la bonne page
        if (!$('#mbcdi_logo_id').length) {
            return;
        }

        let mediaUploader;

        // Upload logo
        $('#mbcdi_upload_logo').on('click', function(e) {
            e.preventDefault();

            if (mediaUploader) {
                mediaUploader.open();
                return;
            }

            mediaUploader = wp.media({
                title: 'Choisir un logo',
                button: { text: 'Utiliser cette image' },
                multiple: false,
                library: { type: 'image' }
            });

            mediaUploader.on('select', function() {
                const attachment = mediaUploader.state().get('selection').first().toJSON();
                $('#mbcdi_logo_id').val(attachment.id);
                $('#mbcdi-logo-preview').attr('src', attachment.url).show();
                $('#mbcdi_remove_logo').show();
            });

            mediaUploader.open();
        });

        // Retirer logo
        $('#mbcdi_remove_logo').on('click', function(e) {
            e.preventDefault();
            $('#mbcdi_logo_id').val('');
            $('#mbcdi-logo-preview').attr('src', '').hide();
            $(this).hide();
        });
    });

})(jQuery);